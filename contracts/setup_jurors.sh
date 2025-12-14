#!/bin/bash

# ============================================================
# HumanWork Protocol - Multi-Juror Setup Script
# ============================================================
# This script sets up 5 juror accounts for dispute testing
# 
# Prerequisites:
# 1. .env.local with PRIVATE_KEY (main deployer account with funds)
# 2. Deployed contracts with addresses exported
# 3. cast (foundry) installed
# ============================================================

set -e

# Load environment
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found!"
  exit 1
fi
source .env.local
source ./export_addresses.sh

# Contract addresses - UPDATE THESE with your deployed addresses
STABLECOIN_ADDRESS="${STABLECOIN_ADDRESS:-0x9DF33f0745FA9d8BD6997B2B848a44dC19026411}"
USER_REGISTRY_ADDRESS="${USER_REGISTRY_ADDRESS:-0x0E0697A6E35ED0170cEB71330d545d8288fd9164}"
DISPUTE_JURY_ADDRESS="${DISPUTE_JURY_ADDRESS:-0x3bB6f801aBe3333A394d3f69ACC3246d565c8266}"
RPC_URL="${HEDERA_TESTNET_RPC:-https://testnet.hashio.io/api}"

# Juror stake amount (100 USDC = 100 * 10^6)
STAKE_AMOUNT=100000000

# File to store juror private keys (KEEP THIS SAFE!)
JUROR_KEYS_FILE="juror_keys.txt"

echo "============================================================"
echo "🏛️  HumanWork Protocol - Multi-Juror Setup"
echo "============================================================"
echo ""
echo "Contract Addresses:"
echo "  Stablecoin:     $STABLECOIN_ADDRESS"
echo "  UserRegistry:   $USER_REGISTRY_ADDRESS"
echo "  DisputeJury:    $DISPUTE_JURY_ADDRESS"
echo "  RPC:            $RPC_URL"
echo ""

# ============================================================
# STEP 1: Generate 5 Juror Wallets
# ============================================================
echo "📝 Step 1: Generating 5 Juror Wallets..."
echo ""

# Clear previous keys file
> $JUROR_KEYS_FILE

declare -a JUROR_ADDRESSES
declare -a JUROR_PRIVATE_KEYS

for i in {1..5}; do
  # Generate new wallet
  WALLET_OUTPUT=$(cast wallet new)
  
  # Extract address and private key
  ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | awk '{print $2}')
  PRIVATE_KEY_JUROR=$(echo "$WALLET_OUTPUT" | grep "Private key:" | awk '{print $3}')
  
  JUROR_ADDRESSES[$i]=$ADDRESS
  JUROR_PRIVATE_KEYS[$i]=$PRIVATE_KEY_JUROR
  
  echo "  Juror $i: $ADDRESS"
  echo "JUROR_${i}_ADDRESS=$ADDRESS" >> $JUROR_KEYS_FILE
  echo "JUROR_${i}_PRIVATE_KEY=$PRIVATE_KEY_JUROR" >> $JUROR_KEYS_FILE
  echo "" >> $JUROR_KEYS_FILE
done

echo ""
echo "✅ Juror wallets saved to $JUROR_KEYS_FILE"
echo "⚠️  KEEP THIS FILE SAFE - Contains private keys!"
echo ""

# ============================================================
# STEP 2: Fund Jurors with HBAR (for gas)
# ============================================================
echo "💰 Step 2: Funding Jurors with HBAR (for gas)..."
echo ""

# Each juror needs ~0.5 HBAR for gas (500000000000000000 wei = 0.5 HBAR)
HBAR_AMOUNT="500000000000000000"

for i in {1..5}; do
  echo "  Funding Juror $i (${JUROR_ADDRESSES[$i]})..."
  
  cast send ${JUROR_ADDRESSES[$i]} \
    --value $HBAR_AMOUNT \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    > /dev/null 2>&1
  
  echo "    ✅ Sent 0.5 HBAR"
  sleep 2
done

echo ""

# ============================================================
# STEP 3: Mint USDC to Each Juror
# ============================================================
echo "🪙 Step 3: Minting USDC to Jurors..."
echo ""

# Mint 200 USDC to each juror (extra for fees)
USDC_AMOUNT=200000000

for i in {1..5}; do
  echo "  Minting USDC to Juror $i..."
  
  cast send $STABLECOIN_ADDRESS \
    "mint(address,uint256)" \
    ${JUROR_ADDRESSES[$i]} \
    $USDC_AMOUNT \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    > /dev/null 2>&1
  
  echo "    ✅ Minted 200 USDC"
  sleep 2
done

echo ""

# ============================================================
# STEP 4: Register Each Juror as Basic User
# ============================================================
echo "📋 Step 4: Registering Jurors as Basic Users..."
echo ""

for i in {1..5}; do
  echo "  Registering Juror $i..."
  
  cast send $USER_REGISTRY_ADDRESS \
    "registerBasic()" \
    --rpc-url $RPC_URL \
    --private-key ${JUROR_PRIVATE_KEYS[$i]} \
    > /dev/null 2>&1 || echo "    ⚠️  May already be registered"
  
  echo "    ✅ Registered"
  sleep 2
done

echo ""

# ============================================================
# STEP 5: Verify Each Juror as Human (MockVerifier auto-passes)
# ============================================================
echo "✅ Step 5: Verifying Jurors as Humans..."
echo ""

for i in {1..5}; do
  echo "  Verifying Juror $i..."
  
  # Create unique proof for each juror (just needs to be different)
  PROOF="0x$(printf '%064x' $i)"
  
  cast send $USER_REGISTRY_ADDRESS \
    "verifyHuman(bytes,uint256[])" \
    $PROOF \
    "[]" \
    --rpc-url $RPC_URL \
    --private-key ${JUROR_PRIVATE_KEYS[$i]} \
    > /dev/null 2>&1 || echo "    ⚠️  May already be verified"
  
  echo "    ✅ Verified as Human"
  sleep 2
done

echo ""

# ============================================================
# STEP 6: Approve DisputeJury to Spend USDC
# ============================================================
echo "🔓 Step 6: Approving DisputeJury to spend USDC..."
echo ""

for i in {1..5}; do
  echo "  Approving for Juror $i..."
  
  cast send $STABLECOIN_ADDRESS \
    "approve(address,uint256)" \
    $DISPUTE_JURY_ADDRESS \
    $STAKE_AMOUNT \
    --rpc-url $RPC_URL \
    --private-key ${JUROR_PRIVATE_KEYS[$i]} \
    > /dev/null 2>&1
  
  echo "    ✅ Approved 100 USDC"
  sleep 2
done

echo ""

# ============================================================
# STEP 7: Stake Each Juror
# ============================================================
echo "🏦 Step 7: Staking Jurors in DisputeJury..."
echo ""

for i in {1..5}; do
  echo "  Staking Juror $i..."
  
  cast send $DISPUTE_JURY_ADDRESS \
    "stakeAsJuror(uint256)" \
    $STAKE_AMOUNT \
    --rpc-url $RPC_URL \
    --private-key ${JUROR_PRIVATE_KEYS[$i]} \
    > /dev/null 2>&1
  
  echo "    ✅ Staked 100 USDC"
  sleep 2
done

echo ""

# ============================================================
# STEP 8: Verify Setup
# ============================================================
echo "🔍 Step 8: Verifying Setup..."
echo ""

JUROR_COUNT=$(cast call $DISPUTE_JURY_ADDRESS "getActiveJurorCount()(uint256)" --rpc-url $RPC_URL)
echo "  Active Jurors: $JUROR_COUNT"

if [ "$JUROR_COUNT" -ge 5 ]; then
  echo ""
  echo "============================================================"
  echo "🎉 SUCCESS! 5 Jurors are now staked and ready!"
  echo "============================================================"
  echo ""
  echo "You can now run dispute tests:"
  echo "  ./test_system.sh"
  echo ""
  echo "Juror addresses saved to: $JUROR_KEYS_FILE"
  echo ""
else
  echo ""
  echo "⚠️  Warning: Only $JUROR_COUNT jurors active. Need at least 5."
  echo "Check the logs above for any errors."
fi

# ============================================================
# Print Summary
# ============================================================
echo ""
echo "============================================================"
echo "📊 Juror Summary"
echo "============================================================"

for i in {1..5}; do
  BALANCE=$(cast call $STABLECOIN_ADDRESS "balanceOf(address)(uint256)" ${JUROR_ADDRESSES[$i]} --rpc-url $RPC_URL)
  STAKE=$(cast call $DISPUTE_JURY_ADDRESS "jurors(address)(uint256,uint256,uint256,bool)" ${JUROR_ADDRESSES[$i]} --rpc-url $RPC_URL | head -1)
  IS_VERIFIED=$(cast call $USER_REGISTRY_ADDRESS "isVerifiedHuman(address)(bool)" ${JUROR_ADDRESSES[$i]} --rpc-url $RPC_URL)
  
  echo "Juror $i: ${JUROR_ADDRESSES[$i]}"
  echo "  USDC Balance: $BALANCE"
  echo "  Staked: $STAKE"
  echo "  Verified Human: $IS_VERIFIED"
  echo ""
done
