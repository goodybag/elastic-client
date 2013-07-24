# Elastic Client

This is a simple [elasticsearch](http://elasticsearch.org) client for node.js. It wraps the http requests to your elasticsearch server. Here's how you use it.

```javascript
var Client = require('elastic-client');
var elastic = new Client({
  host:   'http://localhost' 
, port:   9200
, index:  'elastic-staging'
});
```

## Docs

TODO: Please refer to tests for now :(
