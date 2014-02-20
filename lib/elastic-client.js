var _       = require('underscore');
var request = require('request');

var queryParams = function(data){
  if (typeof data !== "object") return "";
  var params = "?";
  for (var key in data){
    if (Array.isArray(data[key])){
      for (var i = 0, l = data[key].length; i < l; ++i){
        params += key + "[]=" + data[key][i] + "&";
      }
    } else {
      params += key + "=" + data[key] + "&";
    }
  }
  return params.substring(0, params.length - 1);
};

var Client = module.exports = function(options){
  if (!options.host)  throw new Error('Elasticsearch option `host` required');
  if (!options.index) throw new Error('Elasticsearch option `index` required');
  if ( (this.port = +this.port) && isNaN(this.port) )
                      throw new Error('Elasticsearch options `port` is invalid');

  var defaultPort = options.host.indexOf('https') >= 0 ? 443 : 80;

  this.host     = options.host;
  this.port     = options.port || defaultPort;
  this.index    = options.index;

  this.indexProperties = options.indexProperties;

  return this;
};


//////////////////////
//  STATIC METHODS  //
//////////////////////

/**
 * Explicitly create an index - really shouldn't be used ever because
 * elastic search will automatically create new indexes when saving
 * documents
 * @param  {String}   host     Hostname
 * @param  {Number}   port     Port of the host
 * @param  {String}   name     Name of the index
 * @param  {Object}   options  Options for the elasticsearch index
 * @param  {Function} callback Obviously the callback(error)
 */
Client.createIndex = function(host, port, name, options, callback){
  if (typeof options == 'function'){
    callback = options;
    options = {};
  }

  var req = {
    method: 'PUT'
  , url:    host + ':' + port + '/' + name
  , json:   options
  };

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback();
  });
};

/**
 * Remove an index
 * @param  {String}   host     Hostname
 * @param  {Number}   port     Port of the host
 * @param  {String}   name     Name of the index
 * @param  {Object}   options  Options for the elasticsearch index
 * @param  {Function} callback Obviously the callback(error)
 */
Client.deleteIndex = function(host, port, name, options, callback){
  if (typeof options == 'function'){
    callback = options;
    options = {};
  }

  var req = {
    method: 'DELETE'
  , url:    host + ':' + port + '/' + name
  , json:   options
  };

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback();
  });
};

////////////////////////
//  INSTANCE METHODS  //
////////////////////////

/**
 * Ensure the index that this client is associated to has been created
 * @param  {Object}   options  Options for the elasticsearch index
 * @param  {Function} callback Obviously the callback(error)
 */
Client.prototype.ensureIndex = function(options, callback){
  if (typeof options == 'function'){
    callback = options;
    options = {};
  } else {
    options = _.clone( options );
  }

  if (this.indexProperties) _.extend( options, this.indexProperties );

  Client.createIndex( this.host, this.port, this.index, options, callback);

  return this;
};

Client.prototype.removeSelf = function(options, callback){
  Client.deleteIndex( this.host, this.port, this.index, options, callback);

  return this;
};

/**
 * Add or update a document making it searchable
 *
 * PUT /{index}/{type}/{id}
 *     /staging/products/123
 *
 * See http://www.elasticsearch.org/guide/reference/api/index_/
 * for more details
 *
 * @param  {String}   type     elastic search document type
 * @param  {Object}   doc      The document to add or update
 * @param  {Function} callback Obviously the callback(error, result)
 */
Client.prototype.save = function(type, doc, callback){
  if (!doc) throw new Error('Invalid Document passed as second argument to ElasticClient.save', doc);
  if (typeof type != 'string') throw new Error('Invalid document type: `' + typeof type + '`');

  var req = {
    method: 'POST'
  , url:    this.host + ':' + this.port + '/' + this.index + '/' + type
  , json:   doc
  };

  if (doc.id) {
    req.url += '/' + doc.id;
    req.method = 'PUT';
  }

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body);
  });

  return this;
};

/**
 * Get a single document from elasticsearch
 * @param  {String}   type     Elasticsearch document type
 * @param  {Number}   id       ID of document - obviously can be String as well
 * @param  {Function} callback Obviously the callback(error, result)
 */
Client.prototype.get = function(type, id, callback){
  if (typeof type != 'string') throw new Error('Invalid document type: `' + typeof type + '`');

  var req = {
    method: 'GET'
  , url:    this.host + ':' + this.port + '/' + this.index + '/' + type + '/' + id
  , json:   {}
  };

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body ? body._source : null);
  });

  return this;
};

/**
 * Get the mapping for a type
 * @param  {String}   type     Elasticsearch document type
 * @param  {Function} callback Obviously the callback(error, result)
 */
Client.prototype.getMapping = function(type, callback){
  if (typeof type != 'string') throw new Error('Invalid document type: `' + typeof type + '`');

  var req = {
    method: 'GET'
  , url:    this.host + ':' + this.port + '/' + this.index + '/' + type + '/_mapping'
  , json:   {}
  };

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body ? body[type] : null);
  });

  return this;
};

Client.prototype.analyze = function(analyzer, text, callback){
  if (typeof analyzer != 'string') throw new Error('Invalid analyzer: `' + typeof analyzer + '`');

  var req = {
    method: 'GET'
  , url:    this.host + ':' + this.port + '/' + this.index + '/_analyze'
  , json:   {}
  };

  req.url += queryParams({ analyzer: analyzer, text: text });

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body);
  });

  return this;
};

/**
 * Perform a search on elasticserach
 *
 * For all properties for search, see:
 * http://www.elasticsearch.org/guide/reference/api/search/
 *
 * Most searches use the query object, which uses the query-dsl:
 * http://www.elasticsearch.org/guide/reference/query-dsl/
 *
 * {
 *   query:   { ... }
 * , sort:    { ... }
 * , fields:  { ... }
 * , ...
 * }
 *
 * @param  {String}   type     Optional elastic search doc type
 * @param  {Object}   query    Elastic search query dsl object
 * @param  {Function} callback Obviously the callback(error, results)
 */
Client.prototype.search = function(type, query, callback){
  if (typeof type == 'object'){
    callback = query;
    query = type;
    type = null;
  }

  var req = {
    method: 'GET'
  , url:    this.host + ':' + this.port + '/' + this.index
  , json:   query
  };

  var params = {};

  if (query.size) params.size = query.size;
  if (query.from) params.from = query.from;

  if (type) req.url += '/' + type;

  req.url += '/_search';

  req.url += queryParams( params );

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body);
  });

  return this;
};

Client.prototype.del = function(type, id, callback){
  var req = {
    method: 'DELETE'
  , url:    this.host + ':' + this.port + '/' + this.index + '/' + type + '/' + id
  , json:   {}
  };

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body);
  });

  return this;
};

Client.prototype.info = function(callback){
  var req = {
    method: 'GET'
  , url:    this.host + ':' + this.port
  , json:   {}
  };

  request(req, function(error, response, body){
    if (error) return callback ? callback( error ) : null;
    if (response.statusCode >= 400) return callback ? callback( body.error ) : null;

    if (callback) callback(null, body);
  });

  return this;
};