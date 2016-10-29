var swapper = exports;
var crypto = require('crypto');
var signature = require('cookie-signature');
var MobileDetect = require('mobile-detect'); 

//NOTE: use 'Mobile-Detect'
var md = new MobileDetect();

//
// ### function uid(len)
// #### @len {Number} UID length
// Generate UID
// NOTE: Copy paste from 'connect'
//
function uid(len) {
	return crypto.randomBytes(Math.ceil(len * 3 / 4)).toString('base64').slice(0, len);
}

//
// ### function parseSetCookie(arrCookie)
// #### @arrCookie {Object} Set-Cookie header value
// Parse Set-Cookie header and return Cookie association array.
//
function parseSetCookie(arrCookie) {
	var objCookie = {};		//Cookie association array
	for(var i=0; i<arrCookie.length; i++) {
		var cookieAttributes = {};			
		var pairs = arrCookie[i].split(';');	
		
		for(var j=0; j<pairs.length; j++) {
			var pair = pairs[j].split('=');	
			
			if(j === 0) {
				var cookieName = pair[0].trim();			
				var cookieValue = (pair[1] || '').trim();	
			} else {
				cookieAttributes[pair[0].trim().toLowerCase()] = (pair[1] || '').trim();
			}
		}
		
		objCookie[cookieName] = {				
			value: cookieValue,					
			attributes: cookieAttributes		
		};
	}
	
	return objCookie;
}

//
// ### function frameSetCookie(objCookie)
// #### @objCookie {Object} Cookie association array
// Build Set-Cookie header based on Cookie association array.
//
function frameSetCookie(objCookie) {
	var arrCookie = new Array();	// Set-Cookie header value

	Object.keys(objCookie).forEach(function(i) {
		var strCookie = (i + '=' + objCookie[i].value + '; ');

		Object.keys(objCookie[i].attributes).forEach(function(j) {
			if(j === 'secure' || j === 'httponly') {
				strCookie += (j + '; ');
			} else {
				strCookie += (j + '=' + objCookie[i].attributes[j] + '; ');
			}
		});

		arrCookie.push(strCookie.slice(0, -2));
	});
	
	return arrCookie;
}

//
// ### function parseCookie(strCookie)
// #### @strCookie {String} Cookie header value
// Parse Cookie header and return Cookie association array
//
function parseCookie(strCookie) {
	var objCookie = {};		// Cookie association array
	var pairs = strCookie.split(';');	
	
	for(var i=0; i<pairs.length; i++) {
		var pair = pairs[i].split('=');	
		objCookie[pair[0].trim()] = (pair[1] || '').trim();
	}
	
	return objCookie;
}

//
// ### function frameCookie(objCookie)
// #### @objCookie {Object} Cookie association array
// Build Cookie header based on Cookie association array.
//
function frameCookie(objCookie) {
	var strCookie = '';	// Cookie header value

	Object.keys(objCookie).forEach(function(i) {
		strCookie += (i + '=' + objCookie[i] + '; ');
	});

	return strCookie.slice(0, -2);	
}

//
// ### function Swapper()
// Swapper @constructor
//
function Swapper() {
	// SS Cookie association array
	this.SSCookies = {};
	// CS Cookie association array
	this.CSCookies = {};
	// Random character strings used to generate session ID.
	this.secret = uid(12);	
}

//
// ### function create()
// @constructor wrapper
//
exports.create = function create() {
	return new Swapper();
};

//
// ### function SwapSforC(headers)
// #### @headers {Object} Response header
// Swap SS Cookie for CS Cookie
//
Swapper.prototype.swapSforC = function swapSforC(headers) {
	var self = this;
	for(var i in headers) {
		var headerName = (i || '');	
		if(headerName.toLowerCase() !== 'set-cookie') continue;

		var cookies = parseSetCookie(headers[i]);

		Object.keys(cookies).forEach(function(j) {
			//Cookie store flag
			var criteria = (
					!cookies[j].attributes['expires'] &&
					!cookies[j].attributes['max-age'] &&
					cookies[j].attributes.hasOwnProperty('httponly')
			);

			//Mobile device flag
			
			var isMobile = !(
				md.mobile() == null &&
				md.phone() == null &&
				md.tablet() == null &&
				md.os() != 'AndroidOS'
			);
			
			
			if(self.SSCookies.hasOwnProperty(j) && criteria && !isMobile) {
				// The SS Cookie is pre-stored,　
				// Cookie store flag is true and 
				// it is not an access from a mobile device.

				// Restore SS Cookie
				self.SSCookies[j] = cookies[j].value;
				// Load CS Cookie
				cookies[j].value = self.CSCookies[j];	
			} else if(self.SSCookies.hasOwnProperty(j)) {
				// The SS Cookie is pre-stored and Cookie store flag is false.

				// Delete CS Cookie
				delete self.CSCookies[j];	
			} else if(criteria && !isMobile) {
				// The SS Cookie isn't stored,
				// Cookie store flag is true and 
				// it is not an access from a mobile device.

				// Store SS Cookie
				self.SSCookies[j] = cookies[j].value;
				// Generate CS Cookie
				cookies[j].value = 'c:' + signature.sign(uid(24), self.secret);
				// Store CS Cookie
				self.CSCookies[j] = cookies[j].value;
			}
		});

		// Rebuild Set-Cookie header
		headers[i] = frameSetCookie(cookies);
		console.log(headers[i]);	
		break;
	}
};

//
// ### function SwapCforS(headers)
// #### @headers {Object} request header
// Swap CS Cookie for SS Cookie
//
Swapper.prototype.swapCforS = function swapCforS(headers) {
	var self = this;

	if(headers != undefined){
		md = new MobileDetect(headers['user-agent']);
	}

	for(var i in headers) {
		var headerName = (i || '');	
		if(headerName.toLowerCase() !== 'cookie') continue; 

		var cookies = parseCookie(headers[i]);

		Object.keys(cookies).forEach(function(j) {

			if(!self.CSCookies.hasOwnProperty(j)){ 
				//The CS Cookie isn't stored.

				//Not swap CS Cookie for SS Cookie
				return;			
			}else if(cookies[j] === self.CSCookies[j]) {1
				// The CS Cookie is pre-stored.

				// Load SS Cookie
				cookies[j] = self.SSCookies[j];	
			} else if(cookies[j] !== self.SSCookies[j]) {
				// The CS Cookie has the same name as Cookie header but different stored value.
				delete cookies[j];
			}
		});

		// Rebuild Cookie header
		headers[i] = frameCookie(cookies);
		break;
	}
};
