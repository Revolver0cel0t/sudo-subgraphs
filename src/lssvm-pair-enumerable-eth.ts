import {
  AssetRecipientChange as AssetRecipientChangeEvent,
  DeltaUpdate as DeltaUpdateEvent,
  FeeUpdate as FeeUpdateEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SpotPriceUpdate as SpotPriceUpdateEvent,
  SwapNFTsForTokenCall,
  SwapTokenForAnyNFTsCall,
  SwapTokenForSpecificNFTsCall,
  TokenDeposit as TokenDepositEvent,
  TokenWithdrawal as TokenWithdrawalEvent,
  WithdrawERC721Call,
} from "../generated/templates/LSSVMPairEnumerableETH/LSSVMPairEnumerableETH";
import {
  AssetRecipientChange,
  Collection,
  DeltaUpdate,
  FeeUpdate,
  Nft,
  NFTWithdrawal,
  OwnershipTransferred,
  Pair,
  PoolNFTBuys,
  PoolNFTSales,
  ProtocolFeeMultiplier,
  SpotPriceUpdate,
  TokenDataForCollection,
  TokenDeposit,
  TokenWithdrawal,
} from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  fetchHeldIds,
  getTotalTokensAddedFromNFTTrade,
  getTotalTokensRemovedFromNFTTrade,
} from "./helpers";

export function handleAssetRecipientChange(
  event: AssetRecipientChangeEvent
): void {
  let entity = new AssetRecipientChange(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  entity.a = event.params.a;
  entity.timestamp = event.block.timestamp;
  entity.pair = event.address.toHexString();
  entity.save();
  let pair = Pair.load(event.address.toHexString())!;

  if (pair) {
    pair.assetRecipient = event.params.a.toHexString();
    pair.updatedAt = event.block.timestamp;
    pair.save();
  }
}

export function handleDeltaUpdate(event: DeltaUpdateEvent): void {
  let entity = new DeltaUpdate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  ) as DeltaUpdate;
  entity.newDelta = event.params.newDelta;
  entity.timestamp = event.block.timestamp;
  entity.pair = event.address.toHexString();
  entity.save();
  let pair = Pair.load(event.address.toHexString())!;

  if (pair) {
    pair.delta = event.params.newDelta;
    pair.updatedAt = event.block.timestamp;
    pair.save();
  }
}

export function handleFeeUpdate(event: FeeUpdateEvent): void {
  let entity = new FeeUpdate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  entity.newFee = event.params.newFee;
  entity.timestamp = event.block.timestamp;
  entity.pair = event.address.toHexString();
  entity.save();
  let pair = Pair.load(event.address.toHexString())!;

  if (pair) {
    pair.fee = event.params.newFee;
    pair.updatedAt = event.block.timestamp;
    pair.save();
  }
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  entity.newOwner = event.params.newOwner;
  entity.pair = event.address.toHexString();
  entity.timestamp = event.block.timestamp;
  entity.save();
  let pair = Pair.load(event.address.toHexString())!;

  if (pair) {
    pair.owner = event.params.newOwner.toHexString();
    pair.updatedAt = event.block.timestamp;
    pair.save();
  }
}

export function handleSpotPriceUpdate(event: SpotPriceUpdateEvent): void {
  let entity = new SpotPriceUpdate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  entity.newSpotPrice = event.params.newSpotPrice;
  entity.updateTx = event.transaction.hash.toHexString();
  entity.pair = event.address.toHexString();
  entity.timestamp = event.block.timestamp;
  let pair = Pair.load(event.address.toHexString())!;

  if (pair) {
    pair.spotPrice = event.params.newSpotPrice;
    pair.updatedAt = event.block.timestamp;
    pair.save();
    entity.nft = pair.collection;
  }
  entity.save();
}

export function handleNFTWithdrawal(event: WithdrawERC721Call): void {
  let entity = new NFTWithdrawal(event.transaction.hash.toHex());
  let pair = Pair.load(event.to.toHexString())!;
  pair.inventoryCount = pair.inventoryCount!.minus(BigInt.fromI32(1));
  entity.timestamp = event.block.timestamp;
  entity.pair = pair.id;
  entity.save();

  pair.inventoryCount = pair.inventoryCount.minus(
    BigInt.fromI32(event.inputs.nftIds.length)
  );

  let nftIds: string[] = [];
  for (var index = 0; index < event.inputs.nftIds.length; index++) {
    const nftId =
      event.inputs.a.toHexString() +
      "-" +
      event.inputs.nftIds[index].toString();
    nftIds.push(nftId);
    const nft = Nft.load(nftId as string) as Nft;
    nft.pair = null;
    nft.save();
  }

  let finalPairs = [];
  for (var index = 0; index < pair.nfts.length; index++) {
    if (!nftIds.includes(pair.nfts[index])) {
      finalPairs.push(pair.nfts[index]);
    }
  }

  pair.nfts = finalPairs;

  let collection = Collection.load(event.inputs.a.toHexString()) as Collection;
  collection.nftBalance = collection.nftBalance.minus(
    BigInt.fromI32(event.inputs.nftIds.length)
  );
  let finalCollectionPairs = [];
  for (var index = 0; index < collection.nfts.length; index++) {
    if (!nftIds.includes(collection.nfts[index])) {
      finalCollectionPairs.push(collection.nfts[index]);
    }
  }
  collection.nfts = finalCollectionPairs;
  pair.save();
  collection.save();
}

export function handleSwapNFTInPair(event: SwapNFTsForTokenCall): void {
  let entity = new PoolNFTBuys(event.transaction.hash.toHexString());
  let pair = Pair.load(event.to.toHexString()) as Pair;
  let protocolFeeMultiplier =
    ProtocolFeeMultiplier.load("current")!.protocolFeeMultiplier;

  pair.inventoryCount = pair.inventoryCount!.plus(
    BigInt.fromI32(event.inputs.nftIds.length)
  );
  let collection = Collection.load(pair.nft) as Collection;
  collection.nftBalance = collection.nftBalance.plus(
    BigInt.fromI32(event.inputs.nftIds.length)
  );

  event.inputs.nftIds.forEach((nftId: BigInt) => {
    let nft = Nft.load(collection.id + "-" + nftId.toString());
    if (!nft) {
      nft = new Nft(collection.id + "-" + nftId.toString());
      nft.collection = collection.id;
      nft.tokenId = nftId.toString();
    }
    nft.pair = pair.id;
    nft.save();
    collection.nfts.push(nft.id);
    pair.nfts.push(nft.id);
  });

  const removedAmt = getTotalTokensRemovedFromNFTTrade(
    protocolFeeMultiplier,
    pair.fee,
    event.outputs.outputAmount
  );
  pair.tokenBalance = pair.tokenBalance.minus(removedAmt);
  const collectionTokenBalanceString = collection.id + "-" + pair.token;

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  ) as TokenDataForCollection;
  tokenDataForCollection.tokenBalance =
    tokenDataForCollection!.tokenBalance!.minus(removedAmt);

  tokenDataForCollection.save();
  collection.save();
  pair.save();

  entity.fee = pair.fee!;
  entity.pair = event.to.toHexString();
  entity.protocolFee = BigInt.fromString(
    protocolFeeMultiplier
      .times(pair.spotPrice!.toBigDecimal())
      .toString()
      .split(".")[0]
  );
  entity.ethPaidByPool = pair.spotPrice!;
  entity.timestamp = event.block.timestamp;
  entity.nft = pair.collection!;
  entity.save();
}

export function handleSwapNFTOutPair(event: SwapTokenForAnyNFTsCall): void {
  let entity = new PoolNFTSales(event.transaction.hash.toHexString());
  let pair = Pair.load(event.to.toHexString())!;
  let protocolFeeMultiplier = ProtocolFeeMultiplier.load("current")!;

  const heldIds = fetchHeldIds(Address.fromString(pair.id)).map(
    (id) => pair.nft + "-" + id
  );

  let collection = Collection.load(pair.nft) as Collection;
  collection.nftBalance = collection.nftBalance
    .plus(BigInt.fromI32(heldIds.length))
    .minus(pair.inventoryCount);
  pair.inventoryCount = BigInt.fromI32(heldIds.length);
  let nftsToRemoveFromCollection: string[] = [];
  pair.nfts = pair.nfts.filter((nft) => {
    if (!heldIds.includes(nft)) {
      nftsToRemoveFromCollection.push(nft);
      const nftToUpdate = Nft.load(nft) as Nft;
      nftToUpdate.pair = null;
      nftToUpdate.save();
      return false;
    }
    return true;
  });
  collection.nfts = collection.nfts.filter(
    (nft) => !nftsToRemoveFromCollection.includes(nft)
  );

  const tokenIn = getTotalTokensAddedFromNFTTrade(
    protocolFeeMultiplier.protocolFeeMultiplier,
    pair.fee,
    event.outputs.inputAmount
  );
  pair.tokenBalance = pair.tokenBalance.plus(tokenIn);
  const collectionTokenBalanceString = collection.id + "-" + pair.token;

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  ) as TokenDataForCollection;
  tokenDataForCollection.tokenBalance =
    tokenDataForCollection.tokenBalance!.plus(tokenIn);

  tokenDataForCollection.save();
  collection.save();
  pair.save();

  entity.fee = pair.fee!;
  entity.pair = event.to.toHexString();
  entity.protocolFee = BigInt.fromString(
    protocolFeeMultiplier.protocolFeeMultiplier
      .times(pair.spotPrice!.toBigDecimal())
      .toString()
      .split(".")[0]
  );
  entity.ethReceivedByPool = pair.spotPrice!.minus(entity.protocolFee);
  entity.timestamp = event.block.timestamp;
  entity.nft = pair.collection!;
  entity.save();
}

export function handleSwapNFTOutPairSpecificNfts(
  event: SwapTokenForSpecificNFTsCall
): void {
  let entity = new PoolNFTSales(event.transaction.hash.toHexString());
  let pair = Pair.load(event.to.toHexString())!;
  let protocolFeeMultiplier = ProtocolFeeMultiplier.load("current")!;

  let collection = Collection.load(pair.nft) as Collection;
  collection.nftBalance = collection.nftBalance.minus(
    BigInt.fromI32(event.inputs.nftIds.length)
  );
  pair.inventoryCount = pair.inventoryCount.minus(
    BigInt.fromI32(event.inputs.nftIds.length)
  );
  let nftsToRemoveFromCollection: string[] = [];
  const nftIds = event.inputs.nftIds.map(
    (nftId) => collection.id + "-" + nftId
  );
  pair.nfts = pair.nfts.filter((nft) => {
    if (nftIds.includes(nft)) {
      nftsToRemoveFromCollection.push(nft);
      const nftToUpdate = Nft.load(nft) as Nft;
      nftToUpdate.pair = null;
      nftToUpdate.save();
      return false;
    }
    return true;
  });
  collection.nfts = collection.nfts.filter(
    (nft) => !nftsToRemoveFromCollection.includes(nft)
  );

  const tokenIn = getTotalTokensAddedFromNFTTrade(
    protocolFeeMultiplier.protocolFeeMultiplier,
    pair.fee,
    event.outputs.inputAmount
  );
  pair.tokenBalance = pair.tokenBalance.plus(tokenIn);
  const collectionTokenBalanceString = collection.id + "-" + pair.token;

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  ) as TokenDataForCollection;
  tokenDataForCollection.tokenBalance =
    tokenDataForCollection.tokenBalance!.plus(tokenIn);

  tokenDataForCollection.save();
  collection.save();
  pair.save();

  entity.fee = pair.fee!;
  entity.pair = event.to.toHexString();
  entity.protocolFee = BigInt.fromString(
    protocolFeeMultiplier.protocolFeeMultiplier
      .times(pair.spotPrice!.toBigDecimal())
      .toString()
      .split(".")[0]
  );
  entity.ethReceivedByPool = pair.spotPrice!.minus(entity.protocolFee);
  entity.timestamp = event.block.timestamp;
  entity.nft = pair.collection!;
  entity.save();
}

export function handleTokenDeposit(event: TokenDepositEvent): void {
  let entity = new TokenDeposit(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  let pair = Pair.load(event.address.toHexString())!;

  pair.tokenBalance = pair.tokenBalance.plus(event.params.amount);
  const collectionTokenBalanceString = pair.nft + "-" + pair.token;

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  ) as TokenDataForCollection;
  tokenDataForCollection.tokenBalance =
    tokenDataForCollection.tokenBalance!.plus(event.params.amount);

  tokenDataForCollection.save();
  pair.save();

  entity.amountDeposited = event.params.amount;
  entity.pair = event.address.toHexString();
  entity.timestamp = event.block.timestamp;
  pair.tokenBalance = pair.tokenBalance!.plus(event.params.amount);
  entity.save();
}

export function handleTokenWithdrawal(event: TokenWithdrawalEvent): void {
  let entity = new TokenWithdrawal(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  let pair = Pair.load(event.address.toHexString())!;

  pair.tokenBalance = pair.tokenBalance.minus(event.params.amount);
  const collectionTokenBalanceString = pair.nft + "-" + pair.token;

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  ) as TokenDataForCollection;
  tokenDataForCollection.tokenBalance =
    tokenDataForCollection.tokenBalance!.minus(event.params.amount);

  tokenDataForCollection.save();
  pair.save();

  entity.amountWithdrawn = event.params.amount;
  entity.pair = event.address.toHexString();
  entity.timestamp = event.block.timestamp;
  pair.tokenBalance = pair.tokenBalance!.minus(event.params.amount);
  entity.save();
}
