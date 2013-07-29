# Elastic Client

This is a simple [elasticsearch](http://elasticsearch.org) client for node.js. It wraps the http requests to your elasticsearch server. Here's how you use it.

```javascript
var ElasticClient = require('elastic-client');
var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'

, indexProperties: {
    /* ElasticSearch index options. Stuff like mappings and analyzers */
  }
});
```

## Docs

This module exports a constructor that has a couple of static methods defined on it as well. Please refer to the elasticsearch documentation for method options.

### Static Methods

#### Client.createIndex

Explicitly create an index - really shouldn't be used ever because
elastic search will automatically create new indexes when saving
documents

```
@param  {String}   host     Hostname
@param  {Number}   port     Port of the host
@param  {String}   name     Name of the index
@param  {Object}   options  Options for the elasticsearch index
@param  {Function} callback Obviously the callback(error)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

ElasticClient.createIndex(
  'http://es.j0.hn/'  // Host
, 9200                // Port
, 'my-index'          // Index Name
, {                   // Normal ES index options like mappings
    mappings: {
      /* ... */
    }
  }
, function(error, result){ /* ... */ }
)
```

#### Client.deleteIndex

Remove an index

```
@param  {String}   host     Hostname
@param  {Number}   port     Port of the host
@param  {String}   name     Name of the index
@param  {Object}   options  Options for the elasticsearch index
@param  {Function} callback Obviously the callback(error)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

ElasticClient.deleteIndex(
  'http://es.j0.hn/'  // Host
, 9200                // Port
, 'my-index'          // Index Name
, function(error, result){ /* ... */ }
)
```

### Instance Methods

#### Client.prototype.ensureIndex

Ensure the index that this client is associated to has been created

```
@param  {Object}   options  [Optional] Options for the elasticsearch index
@param  {Function} callback [Optional] Obviously the callback(error)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

elastic.ensureIndex(function(error, result){
  /* ... */
});
```

#### Client.prototype.removeSelf

Removes the index that this client is associated to

```
@param  {Object}   options  [Optional] Options for the removal
@param  {Function} callback [Optional] Obviously the callback(error)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

elastic.removeSelf(function(error, result){
  /* ... */
});
```

#### Client.prototype.save

Add or update a document making it searchable

If an ID is supplied, an update is made to that resource. Otherwise, a POST is made. Either way, it doesnt really matter. ES will generate an id for you if you did not supply one. Please refer to ES documentation for the response sent to the client.

Also, 

```
PUT /{index}/{type}/{id}
    /staging/products/123
See http://www.elasticsearch.org/guide/reference/api/index_/
for more details

@param  {String}   type     elastic search document type
@param  {Object}   doc      The document to add or update
@param  {Function} callback Obviously the callback(error, result)
````

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

var doc = {
  id: 111111111111
, name: 'Some Product'
, price: 3400
};

elastic.save('product', doc, function(error, result){
  /* ... */
});
```

#### Client.prototype.get

Get a single document from elasticsearch

```
@param  {String}   type     Elasticsearch document type
@param  {Number}   id       ID of document - obviously can be String as well
@param  {Function} callback Obviously the callback(error, result)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

elastic.get('product', 123, function(error, result){
  /* ... */
});
```

#### Client.prototype.getMapping

Get the mapping for a type

```
@param  {String}   type     Elasticsearch document type
@param  {Function} callback Obviously the callback(error, result)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

myClient.getMapping('product', function(error, result){
  /* result.mapping.product */
});
```

#### Client.prototype.analyze

Runs test input on an analyzer. Returns the tokens the analyzer will match

```
@param  {String}   analyzer The analyzer to be run
@param  {String}   text     The test input
@param  {Function} callback Obviously the callback(error, result)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'

, indexProperties: {
    settings: {
      analysis: {
        analyzer: {
          my_custom_analyzer: {
            type:      'custom'
          , tokenizer: 'standard'

          , filter: [
              'standard'
            , 'lowercase'
            , 'asciifolding'
            ]
          }
        }
      }
    }
  }
});

myClient.ensureIndex(function(error, result){
  var input = 'This is Token\'s Analyzer';

  myClient.analyze('my_custom_analyzer', input, function(error, result){
    /* result.tokens */
  });
});
```

#### Client.prototype.search

Perform a search on elasticserach
For all properties for search, see:
http://www.elasticsearch.org/guide/reference/api/search/

Most searches use the query object, which uses the query-dsl:
http://www.elasticsearch.org/guide/reference/query-dsl/

```
{
  query:   { ... }
, sort:    { ... }
, fields:  { ... }
, ...
}

@param  {String}   type     Optional elastic search doc type
@param  {Object}   query    Elastic search query dsl object
@param  {Function} callback Obviously the callback(error, results)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

var $query = {
  query: {
    match: {
      name: data.product
    }
  }
};

elastic.search('product', $query, function(error, result){
  /* result.hits */
});
```

__Example:__

If you're searching on multiple fields, you might try the ```multi_match``` search property.

```javascript
var $query = {
  query: {
    multi_match: {
      query: data.business.substring(0, 4)
    , fields: [
        'name'
      , 'name.partial'
      , 'businessName'
      , 'businessName.partial'
      ]
    }
  }
};
```

#### Client.prototype.del

Remove an item from elasticsearch

```
@param  {String}   type     Elasticsearch document type
@param  {Number}   id       ID of document - obviously can be String as well
@param  {Function} callback Obviously the callback(error, result)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

myClient.del('product', 37, function(error, result){
  /* ... */
});
```

#### Client.prototype.info

Get server info

```
@param  {Function} callback Obviously the callback(error, result)
```

__Example:__

```javascript
var ElasticClient = require('elastic-client');

var elastic = new ElasticClient({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});

myClient.info(function(error, result){
  /* ... */
});
```