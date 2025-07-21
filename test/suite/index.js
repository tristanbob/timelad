const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

function run() {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: 10000, // 10 seconds timeout for integration tests
    reporter: 'spec'
  });

  const testsRoot = path.normalize(path.resolve(__dirname, '.'));

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return reject(err);
      }

      // Add files to the test suite with normalized paths
      files.forEach(f => mocha.addFile(path.normalize(path.resolve(testsRoot, f))));

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}

module.exports = { run };
