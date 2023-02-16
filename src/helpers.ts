/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";

import { ERC20 } from "../generated/LSSVMPairFactory/ERC20";
import { ERC20SymbolBytes } from "../generated/LSSVMPairFactory/ERC20SymbolBytes";
import { ERC20NameBytes } from "../generated/LSSVMPairFactory/ERC20NameBytes";
import { convertBigDecimalToBigInt } from "./utilities";
import { LSSVMPairEnumerableETH } from "../generated/templates/LSSVMPairEnumerableETH/LSSVMPairEnumerableETH";

export function bigDecimalExp18(): BigDecimal {
  return BigDecimal.fromString("1000000000000000000");
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"; //Denotes the ETH token

export function isNullEthValue(value: string): boolean {
  return (
    value ==
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress);

  // try types string and bytes32 for symbol
  let symbolValue = "unknown";
  let symbolResult = contract.try_symbol();
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol();
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toString())) {
        symbolValue = symbolResultBytes.value.toString();
      }
    }
  } else {
    symbolValue = symbolResult.value;
  }

  return symbolValue;
}

export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let contractNameBytes = ERC20NameBytes.bind(tokenAddress);

  // try types string and bytes32 for name
  let nameValue = "unknown";
  let nameResult = contract.try_name();
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name();
    if (!nameResultBytes.reverted) {
      // for broken exchanges that have no name function exposed
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString();
      }
    }
  } else {
    nameValue = nameResult.value;
  }

  return nameValue;
}

export function fetchHeldIds(pairAddress: Address): BigInt[] {
  let contract = LSSVMPairEnumerableETH.bind(pairAddress);

  // try types string and bytes32 for name
  let nameValue = [];
  let nameResult = contract.try_getAllHeldIds();
  nameValue = nameResult.value;

  return nameValue;
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  let totalSupplyResult = contract.try_totalSupply();
  if (!totalSupplyResult.reverted) {
    return totalSupplyResult.value;
  }
  return BigInt.fromI32(0);
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  // try types uint8 for decimals
  let decimalResult = contract.try_decimals();
  if (!decimalResult.reverted) {
    return BigInt.fromI32(decimalResult.value);
  }
  return BigInt.fromI32(0);
}

export function getTotalTokensRemovedFromNFTTrade(
  protocolFeeMultiplier: BigDecimal,
  feeMultiplier: BigInt,
  outputAmount: BigInt
): BigInt {
  const convertedPFMultiplier = convertBigDecimalToBigInt(
    protocolFeeMultiplier.times(
      BigDecimal.fromString(Math.pow(10, 18).toString())
    )
  );
  const originalInput = outputAmount.div(
    BigInt.fromI32(1).minus(convertedPFMultiplier.minus(feeMultiplier))
  );
  const protocolFee = originalInput.times(convertedPFMultiplier);

  return protocolFee.plus(outputAmount);
}

export function getTotalTokensAddedFromNFTTrade(
  protocolFeeMultiplier: BigDecimal,
  feeMultiplier: BigInt,
  outputAmount: BigInt
): BigInt {
  const convertedPFMultiplier = convertBigDecimalToBigInt(
    protocolFeeMultiplier.times(
      BigDecimal.fromString(Math.pow(10, 18).toString())
    )
  );
  const originalInput = outputAmount.div(
    BigInt.fromI32(1).plus(convertedPFMultiplier.plus(feeMultiplier))
  );
  const protocolFee = originalInput.times(convertedPFMultiplier);

  return protocolFee.plus(outputAmount);
}
