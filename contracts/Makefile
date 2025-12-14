.PHONY: install build test deploy-testnet clean help fmt lint gas-report check-env

check-env:
	@if [ ! -f .env.local ]; then \
		echo "❌ Error: .env.local file not found!"; \
		echo "Create .env.local with your PRIVATE_KEY"; \
		exit 1; \
	fi
	@if grep -q "your_main_account_private_key_here" .env.local; then \
		echo "❌ Error: Replace placeholder in .env.local with real private key"; \
		exit 1; \
	fi

help:
	@echo "Available commands:"
	@echo "  make install         - Install dependencies"
	@echo "  make build           - Build contracts"
	@echo "  make test            - Run tests with verbose output"
	@echo "  make fmt             - Format Solidity code"
	@echo "  make lint            - Lint code"
	@echo "  make gas-report      - Run tests with gas report"
	@echo "  make deploy-testnet  - Deploy to Hedera testnet"
	@echo "  make clean           - Clean build artifacts"

install:
	forge install foundry-rs/forge-std
	forge install OpenZeppelin/openzeppelin-contracts@v5.0.0

build:
	forge build --skip test script

test:
	forge clean
	forge test -vvv

gas-report:
	forge test --gas-report

fmt:
	forge fmt

lint:
	solhint 'src/**/*.sol'

deploy-testnet: check-env
	@bash -c 'source .env.local && forge script script/Deploy.s.sol --rpc-url hedera_testnet --broadcast --legacy --slow --private-key $$PRIVATE_KEY'

clean:
	forge clean
	rm -rf cache broadcast
