import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { log } from "@graphprotocol/graph-ts";
import {
  BondingCurveStatusUpdate as BondingCurveStatusUpdateEvent,
  OwnershipTransferred,
  ProtocolFeeMultiplierUpdate,
  ProtocolFeeRecipientUpdate,
  RouterStatusUpdate,
  CreatePairETHCall,
  CreatePairERC20Call,
  DepositNFTsCall,
  DepositERC20Call,
} from "../generated/LSSVMPairFactory/LSSVMPairFactory";
import {
  Pair,
  BondingCurveStatusUpdate,
  ProtocolFeeMultiplier,
  NFTDeposit,
  TokenDeposit,
  BondingCurve,
  Token,
  Collection,
  Nft,
  TokenDataForCollection,
} from "../generated/schema";
import {
  fetchTokenDecimals,
  fetchTokenName,
  fetchTokenSymbol,
  ZERO_ADDRESS,
} from "./helpers";
// import { createPairEvent } from "./types";

//TODO: Create custom type for createPairParams
function _handleCreatePair(createPairParams): void {
  let newPair = Pair.load(createPairParams.outputs.pair.toHexString()) as Pair;
  if (!newPair) {
    newPair = new Pair(createPairParams.outputs.pair.toHexString());
  }

  let bondingCurve = BondingCurve.load(
    createPairParams.inputs._bondingCurve.toHexString()
  );
  if (!bondingCurve) {
    bondingCurve = new BondingCurve(
      createPairParams.inputs._bondingCurve.toHexString()
    );
  }

  let token = Token.load(createPairParams.inputs.token.address) as Token;
  if (!token) {
    token = new Token(createPairParams.inputs.token.address);
    token.pairCount = BigInt.fromI32(0);
    token.pairs = [];
    if (createPairParams.inputs.token.detailsUnknown) {
      const tokenAddress = Address.fromString(
        createPairParams.inputs.token.address
      );
      token.symbol = fetchTokenSymbol(tokenAddress);
      token.name = fetchTokenName(tokenAddress);
      let decimals = fetchTokenDecimals(tokenAddress);
      // bail if we couldn't figure out the decimals
      if (decimals === null) {
        log.debug("The decimal on token was null", []);
        return;
      }
      token.decimals = decimals.toString();
    } else {
      token.symbol = createPairParams.inputs.token.symbol as string;
      token.decimals = createPairParams.inputs.token.decimals as string;
      token.name = createPairParams.inputs.token.name as string;
    }
  }
  token.pairCount = token.pairCount!.plus(BigInt.fromI32(1));
  token.pairs = token.pairs.concat([newPair.id]);

  let collection = Collection.load(
    createPairParams.inputs._nft.toHexString()
  ) as Collection;
  if (!collection) {
    collection = new Collection(createPairParams.inputs._nft.toHexString());
    collection.nftBalance = BigInt.fromI32(0);
    collection.pairs = [];
    collection.pairCount = BigInt.fromI32(0);
    collection.nfts = [];
    collection.tokenData = [];
  }
  collection.pairs = collection.pairs.concat([newPair.id]);
  collection.pairCount = collection.pairCount!.plus(BigInt.fromI32(1));
  collection.nftBalance = BigInt.fromI32(
    createPairParams.inputs._initialNFTIDs.length
  );

  const collectionTokenBalanceString = `${createPairParams.inputs._nft.toHexString()}-${ZERO_ADDRESS}`;

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  );
  if (!tokenDataForCollection) {
    tokenDataForCollection = new TokenDataForCollection(
      collectionTokenBalanceString
    );
    tokenDataForCollection.collection =
      createPairParams.inputs._nft.toHexString();
    tokenDataForCollection.token = ZERO_ADDRESS;
    tokenDataForCollection.tokenBalance = BigInt.fromI32(0);
    collection.tokenData.push(collectionTokenBalanceString);
  }

  tokenDataForCollection.tokenBalance =
    tokenDataForCollection.tokenBalance!.plus(
      createPairParams.transaction.value
    );

  tokenDataForCollection.save();

  newPair.nfts = [];
  //Cannot use forEach here cause of the assemblyscript closures error
  for (
    var index = 0;
    index < createPairParams.inputs._initialNFTIDs.length;
    index++
  ) {
    const nftId = createPairParams.inputs._initialNFTIDs[index];
    const collectionNFT = `${collection.id}-${nftId.toString()}`;
    let nft = Nft.load(collectionNFT);
    if (!nft) {
      nft = new Nft(collectionNFT);
      nft.collection = collection.id;
      nft.pair = newPair.id;
      nft.tokenId = nftId.toString();
      nft.save();
    }
    collection.nfts.push(nft.id);
    newPair.nfts.push(nft.id);
  }

  newPair.bondingCurve = createPairParams.inputs._bondingCurve.toHexString();
  newPair.assetRecipient =
    createPairParams.inputs._assetRecipient.toHexString();
  newPair.poolType = BigInt.fromI32(createPairParams.inputs._poolType);
  newPair.delta = createPairParams.inputs._delta;
  newPair.fee = createPairParams.inputs._fee;
  newPair.spotPrice = createPairParams.inputs._spotPrice;
  newPair.createdAt = createPairParams.inputs.timestamp;
  newPair.updatedAt = createPairParams.inputs.timestamp;
  newPair.inventoryCount = BigInt.fromI32(
    createPairParams.inputs._initialNFTIDs.length
  );
  newPair.tokenBalance = createPairParams.transaction.value;
  newPair.token = token.id;
  newPair.owner = createPairParams.from.toHexString();
  newPair.createdTx = createPairParams.transactionHash.toHexString();
  newPair.save();

  bondingCurve.save();
  token.save();
  collection.save();
}

export function handleCreatePairETH(event: CreatePairETHCall): void {
  _handleCreatePair({
    outputs: { pair: event.outputs.pair },
    inputs: {
      _bondingCurve: event.inputs._bondingCurve,
      _nft: event.inputs._nft,
      _initialNFTIDs: event.inputs._initialNFTIDs,
      _assetRecipient: event.inputs._assetRecipient,
      _poolType: event.inputs._poolType,
      _delta: event.inputs._delta,
      _fee: event.inputs._fee,
      _spotPrice: event.inputs._spotPrice,
      timestamp: event.block.timestamp,
      token: {
        address: ZERO_ADDRESS,
        detailsUnknown: false,
        name: "Ethereum",
        symbol: "ETH",
        decimals: "18",
      },
    },
    transaction: {
      value: event.transaction.value,
    },
    transactionHash: event.transaction.hash,
    from: event.from,
  });
}

export function handleCreatePairERC20(event: CreatePairERC20Call): void {
  _handleCreatePair({
    outputs: { pair: event.outputs.pair },
    inputs: {
      _bondingCurve: event.inputs.params.bondingCurve,
      _nft: event.inputs.params.nft,
      _initialNFTIDs: event.inputs.params.initialNFTIDs,
      _assetRecipient: event.inputs.params.assetRecipient,
      _poolType: event.inputs.params.poolType,
      _delta: event.inputs.params.delta,
      _fee: event.inputs.params.fee,
      _spotPrice: event.inputs.params.spotPrice,
      timestamp: event.block.timestamp,
      token: {
        address: event.inputs.params.token.toHexString(),
        detailsUnknown: true,
      },
    },
    transaction: {
      value: event.transaction.value,
    },
    transactionHash: event.transaction.hash,
    from: event.from,
  });
}

export function handleBondingCurveStatusUpdate(
  event: BondingCurveStatusUpdateEvent
): void {
  let pair = Pair.load(event.address.toHexString());
  if (pair) {
    let bondingCurve = BondingCurve.load(
      event.params.bondingCurve.toHexString()
    );
    if (!bondingCurve) {
      bondingCurve = new BondingCurve(event.params.bondingCurve.toHexString());
    }
    pair.bondingCurve = bondingCurve.id;
    pair.save();
  }
  let bondingCurveStatusUpdate = new BondingCurveStatusUpdate(
    event.transaction.hash.toHexString()
  );
  bondingCurveStatusUpdate.save();
}

export function handleNFTDeposit(event: DepositNFTsCall): void {
  let pair = Pair.load(event.inputs.recipient.toHexString())!;
  if (!pair) return; //only deal with valid NFT deposits, non native NFTs arent indexed
  let entity = new NFTDeposit(event.transaction.hash.toHex());
  pair.inventoryCount = pair.inventoryCount.plus(
    BigInt.fromI32(event.inputs.ids.length)
  );
  pair.updatedAt = event.block.timestamp;
  entity.timestamp = event.block.timestamp;
  entity.pair = pair.id;

  let collection = Collection.load(event.inputs._nft.toHexString());
  if (!collection) {
    collection = new Collection(event.inputs._nft.toHexString());
    collection.ethBalance = BigInt.fromI32(0);
    collection.nftBalance = BigInt.fromI32(0);
    collection.pairs = [];
    collection.pairCount = BigInt.fromI32(0);
    collection.nfts = [];
  }
  collection.nftBalance = collection.nftBalance!.plus(
    BigInt.fromI32(event.inputs.ids.length)
  );

  for (var index = 0; index < event.inputs.ids.length; index++) {
    const nftId = event.inputs.ids[index];
    let nft = Nft.load(collection.id + "-" + nftId.toString());
    if (!nft) {
      nft = new Nft(collection.id + "-" + nftId.toString());
      nft.collection = collection.id;
      nft.tokenId = nftId.toString();
    }
    nft.pair = pair.id;
    nft.save();
    if (pair.collection === collection.id) {
      collection.nfts.push(nft.id);
    }
    pair.nfts.push(nft.id);
  }

  collection.save();
  pair.save();
  entity.save();
}

// TODO: index ownership changes
export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleProtocolFeeMultiplierUpdate(
  event: ProtocolFeeMultiplierUpdate
): void {
  let protocolFee = new ProtocolFeeMultiplier("current");
  protocolFee.protocolFeeMultiplier = event.params.newMultiplier
    .toBigDecimal()
    .div(BigDecimal.fromString(Math.pow(10, 18).toString()));
  protocolFee.save();
}

// TODO: index recipient changes
export function handleProtocolFeeRecipientUpdate(
  event: ProtocolFeeRecipientUpdate
): void {}

// TODO: index router status changes
export function handleRouterStatusUpdate(event: RouterStatusUpdate): void {}

export function handleTokenDeposit(event: DepositERC20Call): void {
  let pair = Pair.load(event.inputs.recipient.toHexString())!;
  if (!pair) return;
  if (pair.token !== event.inputs.token.toHexString()) return; //only index the actual token for the pool
  let entity = new TokenDeposit(event.transaction.hash.toHexString());
  entity.amountDeposited = event.inputs.amount;
  entity.pair = event.inputs.recipient.toHexString();
  entity.timestamp = event.block.timestamp;
  pair.tokenBalance = pair.tokenBalance!.plus(event.inputs.amount);
  pair.updatedAt = event.block.timestamp;
  entity.save();

  const collectionTokenBalanceString =
    event.inputs.recipient.toHexString() +
    "-" +
    event.inputs.token.toHexString();

  let tokenDataForCollection = TokenDataForCollection.load(
    collectionTokenBalanceString
  );

  tokenDataForCollection!.tokenBalance =
    tokenDataForCollection!.tokenBalance!.plus(event.inputs.amount);

  tokenDataForCollection!.save();
  pair.save();
}
