#!/bin/bash

# ============================================================
# HumanWork Protocol - Export Contract Addresses
# ============================================================
# Run this script to export your deployed contract addresses
# as environment variables for use in other scripts.
#
# Usage:
#   source ./export_addresses.sh
# ============================================================

# UPDATE THESE WITH YOUR ACTUAL DEPLOYED ADDRESSES
# (Copy from your deployment output)

export USDC_ADDRESS="0x9DF33f0745FA9d8BD6997B2B848a44dC19026411"
export USER_REGISTRY_ADDRESS="0x0E0697A6E35ED0170cEB71330d545d8288fd9164"
export AGENCY_REGISTRY_ADDRESS="0x829f593373D7D786e2c6555513204518343ca4AA"
export AI_ORACLE_ADDRESS="0x9cA136e116e6d508c74Ce159Ea740b687e7e0fD2"
export SKILL_TRIAL_ADDRESS="0xE2f95F621Cb4b03BDC26cB14ADBd234Aa694068B"
export PROJECT_ESCROW_ADDRESS="0x3C145424E56FB6db389aFcbE5E834b450Fd4CB7d"
export DISPUTE_JURY_ADDRESS="0x3bB6f801aBe3333A394d3f69ACC3246d565c8266"
export ENTERPRISE_ACCESS_ADDRESS="0x0029f314afe2581EBC568d1a5794273c239834C7"
export GAS_SPONSOR_ADDRESS="0x969CdA619c2Bf66cEE9c527dCd4878C8c52AEf95"
export INSURANCE_POOL_ADDRESS="0x6F13f4d74236ec258FCE50fA86180f5a87acFc60"

echo "✅ Contract addresses exported!"
echo ""
echo "Addresses:"
echo "  STABLECOIN:        $STABLECOIN_ADDRESS"
echo "  USER_REGISTRY:     $USER_REGISTRY_ADDRESS"
echo "  PROJECT_ESCROW:    $PROJECT_ESCROW_ADDRESS"
echo "  DISPUTE_JURY:      $DISPUTE_JURY_ADDRESS"
