const config = require('config');
const R = require('ramda');
const es = require('elasticsearch');

// TODO: Genericize where we get index attributes
const indexSettings = require('../index-templates/user');

const esClient = new es.Client(R.pick(['host'], config.get('elasticsearch')));

// TODO: Create indexNames from cmd-line args
const indexName = {
  dev: 'user-dev',
  test: 'user-test'
};

const esIndex = indexName[process.env.NODE_ENV];

if (!esIndex) {
  console.log('NODE_ENV should be either \'test\' or \'dev\'');
  process.exit(0);
}

// TODO: What happens if item.id is undefined/null?
const bulkRequestBuilder = type =>
  R.compose(
    R.flatten,
    R.map(item =>
      [{ index: { _index: esIndex, _type: type, _id: item.id } }, R.omit('id', item)]
    )
  );

// TODO: Read data from JSON file specified thru cmd-line args
const testUsers = [
  {
    userId: 1,
    username: 'mark.greenwood',
    email: 'mark@email.com',
    createdBy: '1001490',
    createdTimestamp: '2017-07-07T22:11:38.145Z',
    firstName: 'Mark',
    lastName: 'Greenwood',
    jobTitle: 'Software Engineer',
    location: 'PDX',
    notes: '',
    theme: 'sensei',
    license: {
      name: 'sensei',
      version: '',
      accepted: true
    },
    phoneNumber: 'xxx.xxx.xxxx',
    userLevel: 0,
    modifiedTimestamp: '2017-07-07T22:11:38.148Z'
  },
  {
    userId: 2,
    username: 'star.lord',
    email: 'peterq@gotg.net',
    createdBy: '1001490',
    createdTimestamp: '2017-07-10T22:11:38.145Z',
    firstName: 'Peter',
    lastName: 'Quill',
    jobTitle: 'Scrum Master',
    location: 'Terra',
    notes: '',
    theme: 'sensei',
    license: {
      name: 'sensei',
      version: '',
      accepted: true
    },
    phoneNumber: 'xxx.xxx.xxxx',
    userLevel: 0,
    modifiedTimestamp: '2017-07-10T22:11:38.148Z'
  }
];

// TODO: abstract 'type' here
const bulkRequest = bulkRequestBuilder('user')(testUsers);
console.log(bulkRequest);

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
