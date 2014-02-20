var assert  = require('assert');
var async   = require('async');
var config  = require('./config');
var Client  = require('../lib/elastic-client');

var elastic = new Client({
  host:   config.host
, port:   config.port
, index:  config.index

, indexProperties: {
    mappings: {
      product: {
        properties: {

          // Property: name
          //////////////////
          name: {
            type: 'multi_field'
          , fields: {

              // Name analyzer for full product name searching
              name: {
                type:     'string'
              , analyzer: 'prod_biz_name_analyzer'
              , boost:    10
              }

              // Partial Match
            , partial: {
                // analyzer: 'prod_biz_name_partial_analyzer'
                index_analyzer: 'prod_biz_name_partial_analyzer'
              , search_analyzer: 'prod_biz_name_analyzer'
              , type:     'string'
              }
            }
          }

          // Property: businessName
          //////////////////////////
        , businessName: {
            type: 'multi_field'
          , fields: {

              // Name analyzer for full business name searching
              businessName: {
                type:     'string'
              , analyzer: 'prod_biz_name_analyzer'
              , boost:    10
              }

              // Partial Match
            , partial: {
                // analyzer: 'prod_biz_name_partial_analyzer'
                index_analyzer: 'prod_biz_name_partial_analyzer'
              , search_analyzer: 'prod_biz_name_analyzer'
              , type:     'string'
              }
            }
          }
        }
      }
    }

  , settings: {
      analysis: {
        filter: {
          name_ngrams_front: {
            side:     'front'
          , max_gram:  12
          , min_gram:  2
          , type:     'edgeNGram'
          }

        , name_ngrams_back: {
            side:     'back'
          , max_gram:  12
          , min_gram:  2
          , type:     'edgeNGram'
          }
        }

      , char_filter: {
          remove_apostrophes: {
            type:     'mapping'
          , mappings: ["'=>"]
          }
        }

      , analyzer: {
          prod_biz_name_analyzer: {
            type:         'custom'
          , tokenizer:    'standard'
          , filter: [
              'standard'
            , 'lowercase'
            , 'asciifolding'
            ]
          , char_filter: ['remove_apostrophes']
          }

        , prod_biz_name_partial_analyzer: {
            type:         'custom'
          , tokenizer:    'standard'
          , filter: [
              'standard'
            , 'lowercase'
            , 'asciifolding'
            , 'name_ngrams_front'
            , 'name_ngrams_back'
            ]
          , char_filter: ['remove_apostrophes']
          }
        }
      }
    }
  }
});

var dataPopulation = {
  'Batch #1 - Gerdyburger Dirdyberg': {
    product:        'Gerdyburger'
  , business:       'Dirdyberg'
  , numToGenerate:   20
  , generated:       []

  , fn: function(context, done){
      for (var i = 0; i < context.numToGenerate; i++) context.generated.push({
        name:         context.product + ' ' + (i + 1)
      , businessName: context.business
      });

      async.series(
        context.generated.map(function(item){
          return function(done){ elastic.save( 'product', item, done ); }
        }
      )
      , function(error){
          if (error) return done(error);

          // Give ES some time
          setTimeout(done, 1000);
        }
      );
    }
  }
};

before(function(done){

  // Kill everything
  elastic.removeSelf(function(error){

    // And bring back the index
    elastic.ensureIndex(function(error){
      if (error) throw error;

      // Populate all data from tests
      async.series(
        Object.keys( dataPopulation ).map( function(key){
          return function(done){ dataPopulation[key].fn( dataPopulation[key], done ) }
        })
      , done
      )
    });
  });
});

describe ('Elastic Searchin', function(){

  describe ('General Elastic Search Module Stuff', function(){

    it ('should instantiate a new client', function(){
      var options = {
        host:   'http://my-elastic-search.com'
      , index:  'staging'
      };

      var myClient = new Client(options);

      assert.equal( myClient.host, options.host );
      assert.equal( myClient.port, 80 );
      assert.equal( myClient.index, options.index );
    });

    it ('should instantiate a new client with https', function(){
      var options = {
        host:   'https://my-elastic-search.com'
      , index:  'staging'
      };

      var myClient = new Client(options);

      assert.equal( myClient.host, options.host );
      assert.equal( myClient.port, 443 );
      assert.equal( myClient.index, options.index );
    });

    it ('should instantiate a new client with mappings', function(done){
      var mappings;
      var options = {
        host:   config.host
      , port:   config.port
      , index:  config.index + '-' + parseInt(Math.random()*99999).toString(36)

      , indexProperties: {
          mappings: mappings = {
            product: {
              properties: {
                name: {
                  type: 'string'
                , analyzer: 'whitespace'
                }
              }
            }
          }
        }
      };

      var myClient = new Client(options);

      myClient.ensureIndex(function(error){
        assert.equal( !error, true );

        myClient.getMapping('product', function(error, result){
          assert.equal( !error, true );

          for (var field in result.properties){
            for (var property in result.properties[field]){
              assert.equal( mappings.product.properties[field][property], result.properties[field][property] );
            }
          }

          myClient.removeSelf(done);
        });
      });
    });

    it ('should instantiate a new client with settings and make a custom analyzer and filter', function(done){
      var settings;
      var options = {
        host:   config.host
      , port:   config.port
      , index:  config.index + '-' + parseInt(Math.random()*99999).toString(36)

      , indexProperties: {
          settings: settings = {
            analysis: {

              char_filter: {
                my_custom_char_filter: {
                  type:     'mapping'
                , mappings: ["'=>"]
                }
              }

            , analyzer: {
                my_custom_analyzer: {
                  type:         'custom'
                , tokenizer:    'standard'
                , filter: [
                    'standard'
                  , 'lowercase'
                  , 'asciifolding'
                  ]
                , char_filter: ['my_custom_char_filter']
                }
              }
            }
          }
        }
      };

      var myClient = new Client(options);

      myClient.ensureIndex(function(error){
        assert.equal( !error, true );

        var input = 'This is Token\'s Analyzer';

        myClient.analyze('my_custom_analyzer', input, function(error, result){
          assert.equal( !error, true );

          assert.equal(
            result.tokens.map(function(t){
              return t.token;
            }).join(' '), input.replace('\'', '').toLowerCase()
          );

          myClient.removeSelf(done);
        });
      });
    });

    it ('should be able to use the elastic search module', function(){
      assert.equal( elastic.host, config.host );
      assert.equal( elastic.index, config.index );
    });

  });

  describe ('Client.info', function(){

    it ('should get the server info', function(done){
      elastic.info(function(error, info){
        assert.equal( !error, true );
        assert.equal( info.ok, true );
        assert.equal( info.status, 200 );
        assert.equal( !!info.name, true );

        done();
      });
    });

  });

  describe ('Client.save', function(){

    it ('should save a document', function(done){
      var doc = {
        id: 111111111111
      , name: 'Some Product'
      };

      elastic.save('product', doc, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.ok, true );
        assert.equal( result._id, doc.id );

        done();
      });
    });

    it ('should save a document and generate an ID', function(done){
      var doc = {
        name: 'Some Other Product'
      };

      elastic.save('product', doc, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.ok, true );
        assert.equal( !!result._id, true );

        done();
      });
    });

    it ('should save a document and then update it', function(done){
      var doc = {
        id: 222222222222
      , name: 'Another Product'
      };

      elastic.save('product', doc, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.ok, true );
        assert.equal( result._id, doc.id );

        doc.poop = true;

        elastic.save('product', doc, function(error, result){
          assert.equal( !error, true );
          assert.equal( result.ok, true );
          assert.equal( result._id, doc.id );

          elastic.get('product', doc.id, function(error, result){
            assert.equal( !error, true );

            for (var key in result){
              assert.equal( key in doc, true );
              assert.equal( result[key], doc[key] );
            }

            done();
          });
        });

      });
    });

  });

  describe ('Client.get', function(){

    it ('should get a record', function(done){
      var doc = {
        id: 222222222222
      , name: 'Another Product'
      , something: 'else'
      , blah: true
      };

      elastic.save('product', doc, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.ok, true );
        assert.equal( result._id, doc.id );

        elastic.get('product', doc.id, function(error, result){
          assert.equal( !error, true );

          for (var key in result){
            assert.equal( key in doc, true );
            assert.equal( result[key], doc[key] );
          }

          done();
        });
      });
    });

    it ('should not find the record', function(done){
      var doc = {
        id: 222222322222
      };

      elastic.get('product', doc.id, function(error, result){
        assert.equal( !error, true );
        assert.equal( !result, true );

        done();
      });
    });

  });

  describe ('Client.search', function(){

    it ('should search product by name', function(done){

      var data = dataPopulation[ 'Batch #1 - Gerdyburger Dirdyberg' ];

      var $query = {
        query: {
          match: {
            name: data.product
          }
        }
      };

      elastic.search('product', $query, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.hits.total >= data.generated.length, true )
        // At least some of the results are in the initial data set
        // since we may be matching other data populated iwth this being so fuzzy
        assert.equal(
          result.hits.hits.some(function(hit){
            return data.generated.map(function(p){
              return p.name
            }).indexOf(hit._source.name) > -1;
          })
        , true
        );
        done();
      });

    });

    it ('should do a partial search by product name', function(done){

      var data = dataPopulation[ 'Batch #1 - Gerdyburger Dirdyberg' ];

      var $query = {
        query: {
          multi_match: {
            query: data.product.substring(0, 4)
          , fields: ['name.partial']
          }
        }
      };

      elastic.search('product', $query, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.hits.total >= data.generated.length, true )
        // At least some of the results are in the initial data set
        // since we may be matching other data populated iwth this being so fuzzy
        assert.equal(
          result.hits.hits.some(function(hit){
            return data.generated.map(function(p){
              return p.name
            }).indexOf(hit._source.name) > -1;
          })
        , true
        );
        done();
      });

    });

    it ('should do a search on multiple fields', function(done){

      var data = dataPopulation[ 'Batch #1 - Gerdyburger Dirdyberg' ];

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

      elastic.search('product', $query, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.hits.total >= data.generated.length, true )
        // At least some of the results are in the initial data set
        // since we may be matching other data populated iwth this being so fuzzy
        assert.equal(
          result.hits.hits.some(function(hit){
            return data.generated.map(function(p){
              return p.name
            }).indexOf(hit._source.name) > -1;
          })
        , true
        );
        done();
      });

    });

  });

  describe ('Client.del', function(){

    it ('should delete a record', function(done){
      var doc = {
        id: 222222422222
      , name: "To Be Deleted"
      };

      elastic.save('product', doc, function(error, result){
        assert.equal( !error, true );
        assert.equal( result.ok, true );
        assert.equal( result._id, doc.id );

        elastic.get('product', doc.id, function(error, result){
          assert.equal( !error, true );
          assert.equal( !!result, true );

          elastic.del('product', doc.id, function(error, result){
            assert.equal( !error, true );
            assert.equal( result.ok, true );

            elastic.get('product', doc.id, function(error, result){
              assert.equal( !error, true );
              assert.equal( !result, true );

              done();
            });
          });
        });
      });
    });

  });

});