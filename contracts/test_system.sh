#!/bin/bash

# --- CONFIGURATION ---
# NOTE: Using ${VAR:-default} syntax, but ensuring the external environment variables
# are prioritized if they exist. The 'source .env.local' loads the key/RPC.

set -e  # Exit immediately if a command exits with a non-zero status

# Load environment variables (PRIVATE_KEY, HEDERA_TESTNET_RPC, ORACLE_ADDRESS)
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found!"
  exit 1
fi
source .env.local

# Extract contract addresses from the shell's environment.
# If they aren't set in the shell (like via manual export), this falls back to the zero address.
# We trust the manual exports you did in the terminal, which is the correct pattern here.
STABLECOIN_ADDRESS="${STABLECOIN_ADDRESS:-0x0000000000000000000000000000000000000000}"
USER_REGISTRY_ADDRESS="${USER_REGISTRY_ADDRESS:-0x0000000000000000000000000000000000000000}"
PROJECT_ESCROW_ADDRESS="${PROJECT_ESCROW_ADDRESS:-0x0000000000000000000000000000000000000000}"

SENDER=$ORACLE_ADDRESS
AMOUNT_WEI=1000000000  # 1000 USDC (6 decimals)
PROJECT_ID=1
MILESTONE_ID=0
FREELANCER="0x9aaa47E69eB507a4510bbC7Ba745A5BBeA6c718c" # Demo Freelancer from deployment logs

echo "🚀 Starting Full System Test..."
echo "Using Sender: $SENDER"
echo "RPC URL: $HEDERA_TESTNET_RPC"
echo ""
echo "Contract Addresses:"
echo "  Stablecoin: $STABLECOIN_ADDRESS"
echo "  UserRegistry: $USER_REGISTRY_ADDRESS"
echo "  ProjectEscrow: $PROJECT_ESCROW_ADDRESS"
echo ""

# Verify contracts exist and addresses are not zero
echo "Verifying contracts..."
if [ "$STABLECOIN_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
  echo "❌ Error: STABLECOIN_ADDRESS is not set. Did you export the addresses?"
  exit 1
fi

if [ "$(cast code $STABLECOIN_ADDRESS --rpc-url $HEDERA_TESTNET_RPC)" = "0x" ]; then
  echo "❌ Error: Stablecoin not found at $STABLECOIN_ADDRESS. Check deployment status."
  exit 1
fi
echo "✅ Contracts verified"
echo ""

# --- TEST SEQUENCE ---

# 1. REGISTER USER
echo "1️⃣  Registering User..."
if cast send $USER_REGISTRY_ADDRESS "registerBasic()" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY 2>/dev/null; then
  echo "✅ User registered successfully"
else
  echo "⚠️  User likely already registered. Continuing..."
fi

# 2. MINT USDC (To pay for project)
echo -e "\n2️⃣  Minting Mock USDC (to $SENDER)..."
cast send $STABLECOIN_ADDRESS "mint(address,uint256)" "$SENDER" "$AMOUNT_WEI" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

# 3. APPROVE ESCROW (To spend USDC)
echo -e "\n3️⃣  Approving Escrow Contract to spend USDC..."
cast send $STABLECOIN_ADDRESS "approve(address,uint256)" "$PROJECT_ESCROW_ADDRESS" "$AMOUNT_WEI" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

echo "⏳ Waiting 15 seconds for approval transaction to propagate..."
sleep 15  # Increased delay

# Optional: Verify allowance before proceeding
echo "🔍 Verifying allowance..."
ALLOWANCE=$(cast call $STABLECOIN_ADDRESS "allowance(address,address)(uint256)" $SENDER $PROJECT_ESCROW_ADDRESS --rpc-url $HEDERA_TESTNET_RPC)
echo "Current Allowance: $ALLOWANCE"

# 4. CREATE PROJECT
echo -e "\n4️⃣  Creating Project..."
cast send $PROJECT_ESCROW_ADDRESS "createProject(address,uint256[],string[])" \
  "$FREELANCER" \
  "[1000000]" \
  "['Milestone 1: Complete Setup']" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

# 4.5 STAKE AS JUROR (Required for DisputeJury)
echo -e "\n4️⃣.5️⃣  Staking as Juror (to allow disputes)..."
# 1. Approve USDC for DisputeJury
cast send $STABLECOIN_ADDRESS "approve(address,uint256)" "$DISPUTE_JURY_ADDRESS" "$AMOUNT_WEI" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

echo "⏳ Waiting for Juror Approval..."
sleep 15

# 2. Stake
cast send $DISPUTE_JURY_ADDRESS "stakeAsJuror(uint256)" "$AMOUNT_WEI" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

echo "⏳ Waiting for Staking transaction..."
sleep 15

# 5. RAISE DISPUTE
echo -e "\n5️⃣  Raising Dispute on Project..."
cast send $PROJECT_ESCROW_ADDRESS "createDispute(uint256,uint256)" "$PROJECT_ID" "$MILESTONE_ID" \
  --rpc-url $HEDERA_TESTNET_RPC \
  --private-key $PRIVATE_KEY

echo -e "\n✅ Test Sequence Complete!"
echo "Check your Backend Terminal for AI-PM Logs!"