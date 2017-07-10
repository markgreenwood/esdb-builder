const config = require('config');
const R = require('ramda');
const es = require('elasticsearch');
const commandLineArgs = require('command-line-args');

const argOptions = [
  { name: 'dry-run', alias: 'd', type: Boolean, required: false },
  { name: 'verbose', alias: 'v', type: Boolean, required: false },
  { name: 'quiet', alias: 'q', type: Boolean, required: false },
  { name: 'indexname', alias: 'i', type: String, multiple: false, required: true }
];
const args = commandLineArgs(argOptions);

if (args['dry-run']) {
   args.verbose = true;
}

const esClient = new es.Client(R.pick(['host'], config.get('elasticsearch')));

const indexName = R.propOr('', 'indexname', args);
const esIndex = indexName === '' ? null : R.concat(indexName, '-' + process.env.NODE_ENV);

console.log(`Creating index ${esIndex}`);

const bulkRequestBuilder = type =>
  R.compose(
    R.flatten,
    R.map(item =>
      [{ index: { _index: esIndex, _type: type, _id: item.id } }, R.omit('id', item)]
    )
  );

const dataBlob = require(`./data/${indexName}-data`);
const indexSettings = require(`./index-templates/${indexName}-template`);

const bulkRequest = bulkRequestBuilder(dataBlob.type)(dataBlob.data);

if (args.verbose) {
  console.log(bulkRequest);
}

if (args['dry-run']) {
  process.exit(0);
}

// TODO: give the option of deleting the current index or adding to it
esClient.indices.delete({ index: esIndex }, () =>
  esClient.indices.create(
    {
      index: esIndex,
      body: indexSettings
    },
    () => esClient.bulk({ body: bulkRequest }, () =>
      esClient.indices.refresh({})
    )
  )
);
