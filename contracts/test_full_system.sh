#!/bin/bash

# ============================================================
# HumanWork Protocol - Full System Test (with Disputes)
# ============================================================
# Run this AFTER setup_jurors.sh has been executed
# ============================================================

set -e

# Load environment
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found!"
  exit 1
fi
source .env.local

# Contract addresses - UPDATE THESE with your deployed addresses
STABLECOIN_ADDRESS="${STABLECOIN_ADDRESS:-0x9DF33f0745FA9d8BD6997B2B848a44dC19026411}"
USER_REGISTRY_ADDRESS="${USER_REGISTRY_ADDRESS:-0x0E0697A6E35ED0170cEB71330d545d8288fd9164}"
PROJECT_ESCROW_ADDRESS="${PROJECT_ESCROW_ADDRESS:-0xC630c7556776367ecaA5DdF6b84A41A2c3e47afD}"
DISPUTE_JURY_ADDRESS="${DISPUTE_JURY_ADDRESS:-0x3bB6f801aBe3333A394d3f69ACC3246d565c8266}"
RPC_URL="${HEDERA_TESTNET_RPC:-https://testnet.hashio.io/api}"

SENDER=$(cast wallet address --private-key $PRIVATE_KEY)
FREELANCER="0x9aaa47E69eB507a4510bbC7Ba745A5BBeA6c718c"

echo "============================================================"
echo "🧪 HumanWork Protocol - Full System Test"
echo "============================================================"
echo ""
echo "Sender: $SENDER"
echo "Freelancer: $FREELANCER"
echo ""

# ============================================================
# PRE-CHECK: Verify we have enough jurors
# ============================================================
echo "🔍 Pre-Check: Verifying Juror Count..."
JUROR_COUNT=$(cast call $DISPUTE_JURY_ADDRESS "getActiveJurorCount()(uint256)" --rpc-url $RPC_URL)
echo "  Active Jurors: $JUROR_COUNT"

if [ "$JUROR_COUNT" -lt 5 ]; then
  echo ""
  echo "❌ Error: Not enough jurors! Need at least 5, have $JUROR_COUNT"
  echo "Run ./setup_jurors.sh first to set up juror accounts."
  exit 1
fi
echo "  ✅ Sufficient jurors available"
echo ""

# ============================================================
# STEP 1: Fund the Sender (if needed)
# ============================================================
echo "1️⃣  Minting USDC to Sender..."

cast send $STABLECOIN_ADDRESS \
  "mint(address,uint256)" \
  $SENDER \
  "5000000000" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  > /dev/null 2>&1

echo "  ✅ Minted 5000 USDC"
sleep 3

# ============================================================
# STEP 2: Approve Escrow
# ============================================================
echo ""
echo "2️⃣  Approving Escrow to spend USDC..."

cast send $STABLECOIN_ADDRESS \
  "approve(address,uint256)" \
  $PROJECT_ESCROW_ADDRESS \
  "2000000000" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  > /dev/null 2>&1

echo "  ✅ Approved 2000 USDC"
sleep 3

# ============================================================
# STEP 3: Create New Project
# ============================================================
echo ""
echo "3️⃣  Creating New Project..."

TX_HASH=$(cast send $PROJECT_ESCROW_ADDRESS \
  "createProject(address,uint256[],string[])" \
  $FREELANCER \
  "[500000000,500000000]" \
  '["Milestone 1: Design","Milestone 2: Development"]' \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --json | jq -r '.transactionHash')

echo "  ✅ Project Created"
echo "  TX: $TX_HASH"
sleep 3

# Get project ID from counter
PROJECT_ID=$(cast call $PROJECT_ESCROW_ADDRESS "projectCounter()(uint256)" --rpc-url $RPC_URL)
echo "  Project ID: $PROJECT_ID"

# ============================================================
# STEP 4: Raise Dispute on Milestone 0
# ============================================================
echo ""
echo "4️⃣  Raising Dispute on Milestone 0..."

cast send $PROJECT_ESCROW_ADDRESS \
  "createDispute(uint256,uint256)" \
  $PROJECT_ID \
  "0" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  > /dev/null 2>&1

echo "  ✅ Dispute Created!"
sleep 3

# ============================================================
# STEP 5: Get Dispute Details
# ============================================================
echo ""
echo "5️⃣  Fetching Dispute Details..."

DISPUTE_ID=$(cast call $DISPUTE_JURY_ADDRESS "disputeCounter()(uint256)" --rpc-url $RPC_URL)
DISPUTE_ID=$((DISPUTE_ID - 1))  # Get the latest dispute

echo "  Dispute ID: $DISPUTE_ID"

DISPUTE_INFO=$(cast call $DISPUTE_JURY_ADDRESS \
  "getDispute(uint256)(uint256,address,address,uint256,uint8,uint256,uint256,uint256,string)" \
  $DISPUTE_ID \
  --rpc-url $RPC_URL)

echo "  Dispute Info:"
echo "$DISPUTE_INFO" | head -5

# Get assigned jurors
JURORS=$(cast call $DISPUTE_JURY_ADDRESS \
  "getDisputeJurors(uint256)(address[])" \
  $DISPUTE_ID \
  --rpc-url $RPC_URL)

echo ""
echo "  Assigned Jurors:"
echo "$JURORS"

# ============================================================
# STEP 6: Cast Votes (if we have juror keys)
# ============================================================
echo ""
echo "6️⃣  Casting Juror Votes..."

if [ -f "juror_keys.txt" ]; then
  source juror_keys.txt
  
  # Vote with each juror
  for i in {1..5}; do
    JUROR_KEY_VAR="JUROR_${i}_PRIVATE_KEY"
    JUROR_KEY=${!JUROR_KEY_VAR}
    
    if [ -n "$JUROR_KEY" ]; then
      echo "  Juror $i voting AcceptAI (0)..."
      
      cast send $DISPUTE_JURY_ADDRESS \
        "castVote(uint256,uint8)" \
        $DISPUTE_ID \
        "0" \
        --rpc-url $RPC_URL \
        --private-key $JUROR_KEY \
        > /dev/null 2>&1 || echo "    ⚠️  Vote may have failed (not assigned to case?)"
      
      sleep 2
    fi
  done
  
  echo "  ✅ Votes Cast"
else
  echo "  ⚠️  juror_keys.txt not found - skipping voting"
  echo "  Run ./setup_jurors.sh first to create juror accounts"
fi

# ============================================================
# STEP 7: Check Final Dispute Status
# ============================================================
echo ""
echo "7️⃣  Final Dispute Status..."

FINAL_STATUS=$(cast call $DISPUTE_JURY_ADDRESS \
  "getDispute(uint256)(uint256,address,address,uint256,uint8,uint256,uint256,uint256,string)" \
  $DISPUTE_ID \
  --rpc-url $RPC_URL)

echo "$FINAL_STATUS"

echo ""
echo "============================================================"
echo "🎉 Full System Test Complete!"
echo "============================================================"
echo ""
echo "Summary:"
echo "  - Project ID: $PROJECT_ID"
echo "  - Dispute ID: $DISPUTE_ID"
echo "  - Jurors: $JUROR_COUNT active"
echo ""
echo "Check your backend logs for AI-PM processing!"
