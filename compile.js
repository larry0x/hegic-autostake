const path = require('path');
const fs = require('fs');
const solc = require('solc');

function findImports(_path) {
  return { contents: fs.readFileSync(path.resolve(__dirname, 'node_modules', _path), 'utf8') };
}

var input = {
  language: 'Solidity',
  sources: {
    'HegicConverter.sol': {
      content: fs.readFileSync(path.resolve(__dirname, 'contracts/HegicConverter.sol'), 'utf8')
    },
    'MockUpContracts.sol': {
      content: fs.readFileSync(path.resolve(__dirname, 'contracts/MockUpContracts.sol'), 'utf8')
    }
  },
  settings: {
    outputSelection: {
      '*' : { '*': [ 'abi', 'evm.bytecode' ] }
    }
  }
};

var { contracts } = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

module.exports = {
  ...contracts['HegicConverter.sol'],
  ...contracts['MockUpContracts.sol']
};

if (require.main == module) {
  console.log('Contracts compiled!');
  for ( contractName of Object.keys(module.exports) ) {
    console.log('*', contractName);
  }
}
