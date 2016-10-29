'use strict';

var transport = exports;

// Exports utils
transport.utils = require('./secure-spdy-transport/utils');

// Export parser&framer
transport.protocol = {};
transport.protocol.base = require('./secure-spdy-transport/protocol/base');
transport.protocol.spdy = require('./secure-spdy-transport/protocol/spdy');
transport.protocol.http2 = require('./secure-spdy-transport/protocol/http2');

//Export Swapper
transport.swapper = require('./secure-spdy-transport/swapper');

// Window
transport.Window = require('./secure-spdy-transport/window');

// Priority Tree
transport.Priority = require('./secure-spdy-transport/priority');

// Export Connection and Stream
transport.Stream = require('./secure-spdy-transport/stream').Stream;
transport.Connection = require('./secure-spdy-transport/connection').Connection;

// Just for `transport.connection.create()`
transport.connection = transport.Connection;
