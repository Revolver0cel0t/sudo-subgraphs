import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { CreatePairETHCall } from "../generated/LSSVMPairFactory/LSSVMPairFactory";

export type createPairEvent = {
  outputs: {
    pair: Address;
  };
  inputs: {
    _bondingCurve: Address;
    _nft: Address;
    _initialNFTIDs: BigInt[];
    _assetRecipient: Address;
    _poolType: number;
    _delta: BigInt;
    _fee: BigInt;
    _spotPrice: BigInt;
    timestamp: BigInt;
    token: {
      address: string;
      detailsUnknown: boolean;
      symbol?: string;
      decimals?: string;
      name?: string;
    };
  };
  transaction: {
    value: BigInt;
  };
  transactionHash: Bytes;
  from: Address;
};
