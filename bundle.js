(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2}],4:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":1,"ieee754":5,"is-array":6}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],7:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":8}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 1.0.0 Copyright (c) 2011-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                if (callback) {
                    process.nextTick(function () {
                        callback.apply(null, deps);
                    });
                }
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require('_process'),"/node_modules/amdefine/amdefine.js")
},{"_process":8,"path":7}],10:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],11:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
};
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
};
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
};
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
};
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)
},{"buffer":4}],12:[function(require,module,exports){
var parser = require('./parser');
var parseStyle = function(el){
  var style = el.style;
  var output = {};
  for (var i = 0; i < style.length; ++i) {
    var item = style.item(i);
    output[item] = style[item];
  }
  return output;
};

var parseDOM = function(el){
    if(!el.tagName && el.nodeType === Node.TEXT_NODE){
        return JSON.stringify(el.textContent);
    }
    if(!el.attributes){
      return;
    }
    var attributes = {};
    for(var i = 0; i < el.attributes.length; i++){
      var attr = el.attributes[i];
      if(attr.name && attr.value){
        if(attr.name == "style"){
          attributes.style = parseStyle(el);
        }
        else{
          attributes[attr.name] = attr.value;
        }
      }
    }
    var output = "h('" + el.tagName;
    if(attributes.id){
      output = output +'#'+ attributes.id;
      delete attributes.id;
    }
    console.log(attributes)
    if(attributes.class){
      output = output +'.'+ attributes.class.replace(/ /g,".");
      delete attributes.class;
    }
    output += "',";
    output += JSON.stringify(attributes);
    var children = [];
    output += ',[';
    for(var i = 0; i < el.childNodes.length; i++){
      output += parseDOM(el.childNodes[i]) + ",";
    }
    output += "])";
    return output;
};
var parseHTML = function(html){
  return parseDOM(parser(html));
};
exports.parseDOM = parseDOM;
exports.parseHTML = parseHTML;
module.exports = exports;

},{"./parser":13}],13:[function(require,module,exports){
var parser;
if(!window.DOMParser){
  throw new Error("DOMParser required");
}
/* inspired by https://gist.github.com/1129031 */
/*global document, DOMParser*/

(function(DOMParser) {
  "use strict";

  var
    proto = DOMParser.prototype
  , nativeParse = proto.parseFromString
  ;

  // Firefox/Opera/IE throw errors on unsupported types
  try {
    // WebKit returns null on unsupported types
    if ((new DOMParser()).parseFromString("", "text/html")) {
      // text/html parsing is natively supported
      return;
    }
  } catch (ex) {}

  proto.parseFromString = function(markup, type) {
    if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
      var
        doc = document.implementation.createHTMLDocument("")
      ;
            if (markup.toLowerCase().indexOf('<!doctype') > -1) {
              doc.documentElement.innerHTML = markup;
            }
            else {
              doc.body.innerHTML = markup;
            }
      return doc;
    } else {
      return nativeParse.apply(this, arguments);
    }
  };
}(DOMParser));
parser = new DOMParser();
module.exports = function(html,strictChecking){
  var result = parser.parseFromString(html,'text/html');
  var el;
  // Determine if we're interested in the body or just inside
  if(html.substring(0,10).match(/\<body.+/ig)){
    el = result.getElementsByTagName('body')[0];
  }
  else{
    el = result.getElementsByTagName('body')[0].firstChild;
  }
  var errors = el.getElementsByTagName('parsererror');
  if(errors && errors.length > 0){
    if(strictChecking === true){
      throw new Error(errors[0].textContent);
    }
    for(var i = 0; i < errors.length; i++){
      errors[i].parentElement.removeChild(errors[i]);
    }
  }
  return el;
};
},{}],14:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":47}],15:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":2}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _handlebarsRuntime = require('./handlebars.runtime');

// Compiler imports

var _handlebarsRuntime2 = _interopRequireDefault(_handlebarsRuntime);

var _handlebarsCompilerAst = require('./handlebars/compiler/ast');

var _handlebarsCompilerAst2 = _interopRequireDefault(_handlebarsCompilerAst);

var _handlebarsCompilerBase = require('./handlebars/compiler/base');

var _handlebarsCompilerCompiler = require('./handlebars/compiler/compiler');

var _handlebarsCompilerJavascriptCompiler = require('./handlebars/compiler/javascript-compiler');

var _handlebarsCompilerJavascriptCompiler2 = _interopRequireDefault(_handlebarsCompilerJavascriptCompiler);

var _handlebarsCompilerVisitor = require('./handlebars/compiler/visitor');

var _handlebarsCompilerVisitor2 = _interopRequireDefault(_handlebarsCompilerVisitor);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

var _create = _handlebarsRuntime2['default'].create;
function create() {
  var hb = _create();

  hb.compile = function (input, options) {
    return _handlebarsCompilerCompiler.compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return _handlebarsCompilerCompiler.precompile(input, options, hb);
  };

  hb.AST = _handlebarsCompilerAst2['default'];
  hb.Compiler = _handlebarsCompilerCompiler.Compiler;
  hb.JavaScriptCompiler = _handlebarsCompilerJavascriptCompiler2['default'];
  hb.Parser = _handlebarsCompilerBase.parser;
  hb.parse = _handlebarsCompilerBase.parse;

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst.Visitor = _handlebarsCompilerVisitor2['default'];

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars.runtime":17,"./handlebars/compiler/ast":19,"./handlebars/compiler/base":20,"./handlebars/compiler/compiler":22,"./handlebars/compiler/javascript-compiler":24,"./handlebars/compiler/visitor":27,"./handlebars/no-conflict":41}],17:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _handlebarsBase = require('./handlebars/base');

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var base = _interopRequireWildcard(_handlebarsBase);

var _handlebarsSafeString = require('./handlebars/safe-string');

var _handlebarsSafeString2 = _interopRequireDefault(_handlebarsSafeString);

var _handlebarsException = require('./handlebars/exception');

var _handlebarsException2 = _interopRequireDefault(_handlebarsException);

var _handlebarsUtils = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_handlebarsUtils);

var _handlebarsRuntime = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_handlebarsRuntime);

var _handlebarsNoConflict = require('./handlebars/no-conflict');

// For compatibility and usage outside of module systems, make the Handlebars object a namespace

var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _handlebarsSafeString2['default'];
  hb.Exception = _handlebarsException2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_handlebarsNoConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];


},{"./handlebars/base":18,"./handlebars/exception":31,"./handlebars/no-conflict":41,"./handlebars/runtime":42,"./handlebars/safe-string":43,"./handlebars/utils":44}],18:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('./utils');

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _helpers = require('./helpers');

var _decorators = require('./decorators');

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var VERSION = '4.0.4';
exports.VERSION = VERSION;
var COMPILER_REVISION = 7;

exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1',
  7: '>= 4.0.0'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials, decorators) {
  this.helpers = helpers || {};
  this.partials = partials || {};
  this.decorators = decorators || {};

  _helpers.registerDefaultHelpers(this);
  _decorators.registerDefaultDecorators(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: _logger2['default'],
  log: _logger2['default'].log,

  registerHelper: function registerHelper(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple helpers');
      }
      _utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (_utils.toString.call(name) === objectType) {
      _utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  },

  registerDecorator: function registerDecorator(name, fn) {
    if (_utils.toString.call(name) === objectType) {
      if (fn) {
        throw new _exception2['default']('Arg not supported with multiple decorators');
      }
      _utils.extend(this.decorators, name);
    } else {
      this.decorators[name] = fn;
    }
  },
  unregisterDecorator: function unregisterDecorator(name) {
    delete this.decorators[name];
  }
};

var log = _logger2['default'].log;

exports.log = log;
exports.createFrame = _utils.createFrame;
exports.logger = _logger2['default'];


},{"./decorators":29,"./exception":31,"./helpers":32,"./logger":40,"./utils":44}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var AST = {
  // Public API used to evaluate derived attributes regarding AST nodes
  helpers: {
    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    helperExpression: function helperExpression(node) {
      return node.type === 'SubExpression' || (node.type === 'MustacheStatement' || node.type === 'BlockStatement') && !!(node.params && node.params.length || node.hash);
    },

    scopedId: function scopedId(path) {
      return (/^\.|this\b/.test(path.original)
      );
    },

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    simpleId: function simpleId(path) {
      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
    }
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// must modify the object to operate properly.
exports['default'] = AST;
module.exports = exports['default'];


},{}],20:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.parse = parse;
// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _whitespaceControl = require('./whitespace-control');

var _whitespaceControl2 = _interopRequireDefault(_whitespaceControl);

var _helpers = require('./helpers');

var Helpers = _interopRequireWildcard(_helpers);

var _utils = require('../utils');

exports.parser = _parser2['default'];

var yy = {};
_utils.extend(yy, Helpers);

function parse(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2['default'].yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new _whitespaceControl2['default'](options);
  return strip.accept(_parser2['default'].parse(input));
}


},{"../utils":44,"./helpers":23,"./parser":25,"./whitespace-control":28}],21:[function(require,module,exports){
/* global define */
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

var SourceNode = undefined;

try {
  /* istanbul ignore next */
  if (typeof define !== 'function' || !define.amd) {
    // We don't support this in AMD environments. For these environments, we asusme that
    // they are running on the browser and thus have no need for the source-map library.
    var SourceMap = require('source-map');
    SourceNode = SourceMap.SourceNode;
  }
} catch (err) {}
/* NOP */

/* istanbul ignore if: tested but not covered in istanbul due to dist build  */
if (!SourceNode) {
  SourceNode = function (line, column, srcFile, chunks) {
    this.src = '';
    if (chunks) {
      this.add(chunks);
    }
  };
  /* istanbul ignore next */
  SourceNode.prototype = {
    add: function add(chunks) {
      if (_utils.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src += chunks;
    },
    prepend: function prepend(chunks) {
      if (_utils.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src = chunks + this.src;
    },
    toStringWithSourceMap: function toStringWithSourceMap() {
      return { code: this.toString() };
    },
    toString: function toString() {
      return this.src;
    }
  };
}

function castChunk(chunk, codeGen, loc) {
  if (_utils.isArray(chunk)) {
    var ret = [];

    for (var i = 0, len = chunk.length; i < len; i++) {
      ret.push(codeGen.wrap(chunk[i], loc));
    }
    return ret;
  } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
    // Handle primitives that the SourceNode will throw up on
    return chunk + '';
  }
  return chunk;
}

function CodeGen(srcFile) {
  this.srcFile = srcFile;
  this.source = [];
}

CodeGen.prototype = {
  isEmpty: function isEmpty() {
    return !this.source.length;
  },
  prepend: function prepend(source, loc) {
    this.source.unshift(this.wrap(source, loc));
  },
  push: function push(source, loc) {
    this.source.push(this.wrap(source, loc));
  },

  merge: function merge() {
    var source = this.empty();
    this.each(function (line) {
      source.add(['  ', line, '\n']);
    });
    return source;
  },

  each: function each(iter) {
    for (var i = 0, len = this.source.length; i < len; i++) {
      iter(this.source[i]);
    }
  },

  empty: function empty() {
    var loc = this.currentLocation || { start: {} };
    return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
  },
  wrap: function wrap(chunk) {
    var loc = arguments.length <= 1 || arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

    if (chunk instanceof SourceNode) {
      return chunk;
    }

    chunk = castChunk(chunk, this, loc);

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
  },

  functionCall: function functionCall(fn, type, params) {
    params = this.generateList(params);
    return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
  },

  quotedString: function quotedString(str) {
    return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
    .replace(/\u2029/g, '\\u2029') + '"';
  },

  objectLiteral: function objectLiteral(obj) {
    var pairs = [];

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = castChunk(obj[key], this);
        if (value !== 'undefined') {
          pairs.push([this.quotedString(key), ':', value]);
        }
      }
    }

    var ret = this.generateList(pairs);
    ret.prepend('{');
    ret.add('}');
    return ret;
  },

  generateList: function generateList(entries) {
    var ret = this.empty();

    for (var i = 0, len = entries.length; i < len; i++) {
      if (i) {
        ret.add(',');
      }

      ret.add(castChunk(entries[i], this));
    }

    return ret;
  },

  generateArray: function generateArray(entries) {
    var ret = this.generateList(entries);
    ret.prepend('[');
    ret.add(']');

    return ret;
  }
};

exports['default'] = CodeGen;
module.exports = exports['default'];


},{"../utils":44,"source-map":50}],22:[function(require,module,exports){
/* eslint-disable new-cap */

'use strict';

exports.__esModule = true;
exports.Compiler = Compiler;
exports.precompile = precompile;
exports.compile = compile;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

var _utils = require('../utils');

var _ast = require('./ast');

var _ast2 = _interopRequireDefault(_ast);

var slice = [].slice;

function Compiler() {}

// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  equals: function equals(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
        return false;
      }
    }

    // We know that length is the same between the two arrays because they are directly tied
    // to the opcode behavior above.
    len = this.children.length;
    for (var i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function compile(program, options) {
    this.sourceNode = [];
    this.opcodes = [];
    this.children = [];
    this.options = options;
    this.stringParams = options.stringParams;
    this.trackIds = options.trackIds;

    options.blockParams = options.blockParams || [];

    // These changes will propagate to the other compiler components
    var knownHelpers = options.knownHelpers;
    options.knownHelpers = {
      'helperMissing': true,
      'blockHelperMissing': true,
      'each': true,
      'if': true,
      'unless': true,
      'with': true,
      'log': true,
      'lookup': true
    };
    if (knownHelpers) {
      for (var _name in knownHelpers) {
        /* istanbul ignore else */
        if (_name in knownHelpers) {
          options.knownHelpers[_name] = knownHelpers[_name];
        }
      }
    }

    return this.accept(program);
  },

  compileProgram: function compileProgram(program) {
    var childCompiler = new this.compiler(),
        // eslint-disable-line new-cap
    result = childCompiler.compile(program, this.options),
        guid = this.guid++;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;
    this.useDepths = this.useDepths || result.useDepths;

    return guid;
  },

  accept: function accept(node) {
    /* istanbul ignore next: Sanity code */
    if (!this[node.type]) {
      throw new _exception2['default']('Unknown type: ' + node.type, node);
    }

    this.sourceNode.unshift(node);
    var ret = this[node.type](node);
    this.sourceNode.shift();
    return ret;
  },

  Program: function Program(program) {
    this.options.blockParams.unshift(program.blockParams);

    var body = program.body,
        bodyLength = body.length;
    for (var i = 0; i < bodyLength; i++) {
      this.accept(body[i]);
    }

    this.options.blockParams.shift();

    this.isSimple = bodyLength === 1;
    this.blockParams = program.blockParams ? program.blockParams.length : 0;

    return this;
  },

  BlockStatement: function BlockStatement(block) {
    transformLiteralToPath(block);

    var program = block.program,
        inverse = block.inverse;

    program = program && this.compileProgram(program);
    inverse = inverse && this.compileProgram(inverse);

    var type = this.classifySexpr(block);

    if (type === 'helper') {
      this.helperSexpr(block, program, inverse);
    } else if (type === 'simple') {
      this.simpleSexpr(block);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue', block.path.original);
    } else {
      this.ambiguousSexpr(block, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  DecoratorBlock: function DecoratorBlock(decorator) {
    var program = decorator.program && this.compileProgram(decorator.program);
    var params = this.setupFullMustacheParams(decorator, program, undefined),
        path = decorator.path;

    this.useDecorators = true;
    this.opcode('registerDecorator', params.length, path.original);
  },

  PartialStatement: function PartialStatement(partial) {
    this.usePartial = true;

    var program = partial.program;
    if (program) {
      program = this.compileProgram(partial.program);
    }

    var params = partial.params;
    if (params.length > 1) {
      throw new _exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
    } else if (!params.length) {
      if (this.options.explicitPartialContext) {
        this.opcode('pushLiteral', 'undefined');
      } else {
        params.push({ type: 'PathExpression', parts: [], depth: 0 });
      }
    }

    var partialName = partial.name.original,
        isDynamic = partial.name.type === 'SubExpression';
    if (isDynamic) {
      this.accept(partial.name);
    }

    this.setupFullMustacheParams(partial, program, undefined, true);

    var indent = partial.indent || '';
    if (this.options.preventIndent && indent) {
      this.opcode('appendContent', indent);
      indent = '';
    }

    this.opcode('invokePartial', isDynamic, partialName, indent);
    this.opcode('append');
  },
  PartialBlockStatement: function PartialBlockStatement(partialBlock) {
    this.PartialStatement(partialBlock);
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.SubExpression(mustache);

    if (mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },
  Decorator: function Decorator(decorator) {
    this.DecoratorBlock(decorator);
  },

  ContentStatement: function ContentStatement(content) {
    if (content.value) {
      this.opcode('appendContent', content.value);
    }
  },

  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    transformLiteralToPath(sexpr);
    var type = this.classifySexpr(sexpr);

    if (type === 'simple') {
      this.simpleSexpr(sexpr);
    } else if (type === 'helper') {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },
  ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
    var path = sexpr.path,
        name = path.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', path.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    path.strict = true;
    this.accept(path);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function simpleSexpr(sexpr) {
    var path = sexpr.path;
    path.strict = true;
    this.accept(path);
    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function helperSexpr(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        path = sexpr.path,
        name = path.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new _exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
    } else {
      path.strict = true;
      path.falsy = true;

      this.accept(path);
      this.opcode('invokeHelper', params.length, path.original, _ast2['default'].helpers.simpleId(path));
    }
  },

  PathExpression: function PathExpression(path) {
    this.addDepth(path.depth);
    this.opcode('getContext', path.depth);

    var name = path.parts[0],
        scoped = _ast2['default'].helpers.scopedId(path),
        blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

    if (blockParamId) {
      this.opcode('lookupBlockParam', blockParamId, path.parts);
    } else if (!name) {
      // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
      this.opcode('pushContext');
    } else if (path.data) {
      this.options.data = true;
      this.opcode('lookupData', path.depth, path.parts, path.strict);
    } else {
      this.opcode('lookupOnContext', path.parts, path.falsy, path.strict, scoped);
    }
  },

  StringLiteral: function StringLiteral(string) {
    this.opcode('pushString', string.value);
  },

  NumberLiteral: function NumberLiteral(number) {
    this.opcode('pushLiteral', number.value);
  },

  BooleanLiteral: function BooleanLiteral(bool) {
    this.opcode('pushLiteral', bool.value);
  },

  UndefinedLiteral: function UndefinedLiteral() {
    this.opcode('pushLiteral', 'undefined');
  },

  NullLiteral: function NullLiteral() {
    this.opcode('pushLiteral', 'null');
  },

  Hash: function Hash(hash) {
    var pairs = hash.pairs,
        i = 0,
        l = pairs.length;

    this.opcode('pushHash');

    for (; i < l; i++) {
      this.pushParam(pairs[i].value);
    }
    while (i--) {
      this.opcode('assignToHash', pairs[i].key);
    }
    this.opcode('popHash');
  },

  // HELPERS
  opcode: function opcode(name) {
    this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
  },

  addDepth: function addDepth(depth) {
    if (!depth) {
      return;
    }

    this.useDepths = true;
  },

  classifySexpr: function classifySexpr(sexpr) {
    var isSimple = _ast2['default'].helpers.simpleId(sexpr.path);

    var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var isHelper = !isBlockParam && _ast2['default'].helpers.helperExpression(sexpr);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    var isEligible = !isBlockParam && (isHelper || isSimple);

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      var _name2 = sexpr.path.parts[0],
          options = this.options;

      if (options.knownHelpers[_name2]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return 'helper';
    } else if (isEligible) {
      return 'ambiguous';
    } else {
      return 'simple';
    }
  },

  pushParams: function pushParams(params) {
    for (var i = 0, l = params.length; i < l; i++) {
      this.pushParam(params[i]);
    }
  },

  pushParam: function pushParam(val) {
    var value = val.value != null ? val.value : val.original || '';

    if (this.stringParams) {
      if (value.replace) {
        value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
      }

      if (val.depth) {
        this.addDepth(val.depth);
      }
      this.opcode('getContext', val.depth || 0);
      this.opcode('pushStringParam', value, val.type);

      if (val.type === 'SubExpression') {
        // SubExpressions get evaluated and passed in
        // in string params mode.
        this.accept(val);
      }
    } else {
      if (this.trackIds) {
        var blockParamIndex = undefined;
        if (val.parts && !_ast2['default'].helpers.scopedId(val) && !val.depth) {
          blockParamIndex = this.blockParamIndex(val.parts[0]);
        }
        if (blockParamIndex) {
          var blockParamChild = val.parts.slice(1).join('.');
          this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
        } else {
          value = val.original || value;
          if (value.replace) {
            value = value.replace(/^this(?:\.|$)/, '').replace(/^\.\//, '').replace(/^\.$/, '');
          }

          this.opcode('pushId', val.type, value);
        }
      }
      this.accept(val);
    }
  },

  setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.accept(sexpr.hash);
    } else {
      this.opcode('emptyHash', omitEmpty);
    }

    return params;
  },

  blockParamIndex: function blockParamIndex(name) {
    for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
      var blockParams = this.options.blockParams[depth],
          param = blockParams && _utils.indexOf(blockParams, name);
      if (blockParams && param >= 0) {
        return [depth, param];
      }
    }
  }
};

function precompile(input, options, env) {
  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var ast = env.parse(input, options),
      environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

function compile(input, options, env) {
  if (options === undefined) options = {};

  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
  }

  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var compiled = undefined;

  function compileInput() {
    var ast = env.parse(input, options),
        environment = new env.Compiler().compile(ast, options),
        templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  function ret(context, execOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, execOptions);
  }
  ret._setup = function (setupOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._setup(setupOptions);
  };
  ret._child = function (i, data, blockParams, depths) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._child(i, data, blockParams, depths);
  };
  return ret;
}

function argEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (_utils.isArray(a) && _utils.isArray(b) && a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (!argEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}

function transformLiteralToPath(sexpr) {
  if (!sexpr.path.parts) {
    var literal = sexpr.path;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    sexpr.path = {
      type: 'PathExpression',
      data: false,
      depth: 0,
      parts: [literal.original + ''],
      original: literal.original + '',
      loc: literal.loc
    };
  }
}


},{"../exception":31,"../utils":44,"./ast":19}],23:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.SourceLocation = SourceLocation;
exports.id = id;
exports.stripFlags = stripFlags;
exports.stripComment = stripComment;
exports.preparePath = preparePath;
exports.prepareMustache = prepareMustache;
exports.prepareRawBlock = prepareRawBlock;
exports.prepareBlock = prepareBlock;
exports.prepareProgram = prepareProgram;
exports.preparePartialBlock = preparePartialBlock;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

function validateClose(open, close) {
  close = close.path ? close.path.original : close;

  if (open.path.original !== close) {
    var errorNode = { loc: open.path.loc };

    throw new _exception2['default'](open.path.original + " doesn't match " + close, errorNode);
  }
}

function SourceLocation(source, locInfo) {
  this.source = source;
  this.start = {
    line: locInfo.first_line,
    column: locInfo.first_column
  };
  this.end = {
    line: locInfo.last_line,
    column: locInfo.last_column
  };
}

function id(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substr(1, token.length - 2);
  } else {
    return token;
  }
}

function stripFlags(open, close) {
  return {
    open: open.charAt(2) === '~',
    close: close.charAt(close.length - 3) === '~'
  };
}

function stripComment(comment) {
  return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
}

function preparePath(data, parts, loc) {
  loc = this.locInfo(loc);

  var original = data ? '@' : '',
      dig = [],
      depth = 0,
      depthString = '';

  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i].part,

    // If we have [] syntax then we do not treat path references as operators,
    // i.e. foo.[this] resolves to approximately context.foo['this']
    isLiteral = parts[i].original !== part;
    original += (parts[i].separator || '') + part;

    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
      if (dig.length > 0) {
        throw new _exception2['default']('Invalid path: ' + original, { loc: loc });
      } else if (part === '..') {
        depth++;
        depthString += '../';
      }
    } else {
      dig.push(part);
    }
  }

  return {
    type: 'PathExpression',
    data: data,
    depth: depth,
    parts: dig,
    original: original,
    loc: loc
  };
}

function prepareMustache(path, params, hash, open, strip, locInfo) {
  // Must use charAt to support IE pre-10
  var escapeFlag = open.charAt(3) || open.charAt(2),
      escaped = escapeFlag !== '{' && escapeFlag !== '&';

  var decorator = /\*/.test(open);
  return {
    type: decorator ? 'Decorator' : 'MustacheStatement',
    path: path,
    params: params,
    hash: hash,
    escaped: escaped,
    strip: strip,
    loc: this.locInfo(locInfo)
  };
}

function prepareRawBlock(openRawBlock, contents, close, locInfo) {
  validateClose(openRawBlock, close);

  locInfo = this.locInfo(locInfo);
  var program = {
    type: 'Program',
    body: contents,
    strip: {},
    loc: locInfo
  };

  return {
    type: 'BlockStatement',
    path: openRawBlock.path,
    params: openRawBlock.params,
    hash: openRawBlock.hash,
    program: program,
    openStrip: {},
    inverseStrip: {},
    closeStrip: {},
    loc: locInfo
  };
}

function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
  if (close && close.path) {
    validateClose(openBlock, close);
  }

  var decorator = /\*/.test(openBlock.open);

  program.blockParams = openBlock.blockParams;

  var inverse = undefined,
      inverseStrip = undefined;

  if (inverseAndProgram) {
    if (decorator) {
      throw new _exception2['default']('Unexpected inverse block on decorator', inverseAndProgram);
    }

    if (inverseAndProgram.chain) {
      inverseAndProgram.program.body[0].closeStrip = close.strip;
    }

    inverseStrip = inverseAndProgram.strip;
    inverse = inverseAndProgram.program;
  }

  if (inverted) {
    inverted = inverse;
    inverse = program;
    program = inverted;
  }

  return {
    type: decorator ? 'DecoratorBlock' : 'BlockStatement',
    path: openBlock.path,
    params: openBlock.params,
    hash: openBlock.hash,
    program: program,
    inverse: inverse,
    openStrip: openBlock.strip,
    inverseStrip: inverseStrip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}

function prepareProgram(statements, loc) {
  if (!loc && statements.length) {
    var firstLoc = statements[0].loc,
        lastLoc = statements[statements.length - 1].loc;

    /* istanbul ignore else */
    if (firstLoc && lastLoc) {
      loc = {
        source: firstLoc.source,
        start: {
          line: firstLoc.start.line,
          column: firstLoc.start.column
        },
        end: {
          line: lastLoc.end.line,
          column: lastLoc.end.column
        }
      };
    }
  }

  return {
    type: 'Program',
    body: statements,
    strip: {},
    loc: loc
  };
}

function preparePartialBlock(open, program, close, locInfo) {
  validateClose(open, close);

  return {
    type: 'PartialBlockStatement',
    name: open.path,
    params: open.params,
    hash: open.hash,
    program: program,
    openStrip: open.strip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}


},{"../exception":31}],24:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('../base');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

var _utils = require('../utils');

var _codeGen = require('./code-gen');

var _codeGen2 = _interopRequireDefault(_codeGen);

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function nameLookup(parent, name /* , type*/) {
    if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      return [parent, '.', name];
    } else {
      return [parent, '[', JSON.stringify(name), ']'];
    }
  },
  depthedLookup: function depthedLookup(name) {
    return [this.aliasable('container.lookup'), '(depths, "', name, '")'];
  },

  compilerInfo: function compilerInfo() {
    var revision = _base.COMPILER_REVISION,
        versions = _base.REVISION_CHANGES[revision];
    return [revision, versions];
  },

  appendToBuffer: function appendToBuffer(source, location, explicit) {
    // Force a source as this simplifies the merge logic.
    if (!_utils.isArray(source)) {
      source = [source];
    }
    source = this.source.wrap(source, location);

    if (this.environment.isSimple) {
      return ['return ', source, ';'];
    } else if (explicit) {
      // This is a case where the buffer operation occurs as a child of another
      // construct, generally braces. We have to explicitly output these buffer
      // operations to ensure that the emitted code goes in the correct location.
      return ['buffer += ', source, ';'];
    } else {
      source.appendToBuffer = true;
      return source;
    }
  },

  initializeBuffer: function initializeBuffer() {
    return this.quotedString('');
  },
  // END PUBLIC API

  compile: function compile(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options;
    this.stringParams = this.options.stringParams;
    this.trackIds = this.options.trackIds;
    this.precompile = !asObject;

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      decorators: [],
      programs: [],
      environments: []
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.aliases = {};
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];
    this.blockParams = [];

    this.compileChildren(environment, options);

    this.useDepths = this.useDepths || environment.useDepths || environment.useDecorators || this.options.compat;
    this.useBlockParams = this.useBlockParams || environment.useBlockParams;

    var opcodes = environment.opcodes,
        opcode = undefined,
        firstLoc = undefined,
        i = undefined,
        l = undefined;

    for (i = 0, l = opcodes.length; i < l; i++) {
      opcode = opcodes[i];

      this.source.currentLocation = opcode.loc;
      firstLoc = firstLoc || opcode.loc;
      this[opcode.opcode].apply(this, opcode.args);
    }

    // Flush any trailing content that might be pending.
    this.source.currentLocation = firstLoc;
    this.pushSource('');

    /* istanbul ignore next */
    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new _exception2['default']('Compile completed with content left on stack');
    }

    if (!this.decorators.isEmpty()) {
      this.useDecorators = true;

      this.decorators.prepend('var decorators = container.decorators;\n');
      this.decorators.push('return fn;');

      if (asObject) {
        this.decorators = Function.apply(this, ['fn', 'props', 'container', 'depth0', 'data', 'blockParams', 'depths', this.decorators.merge()]);
      } else {
        this.decorators.prepend('function(fn, props, container, depth0, data, blockParams, depths) {\n');
        this.decorators.push('}\n');
        this.decorators = this.decorators.merge();
      }
    } else {
      this.decorators = undefined;
    }

    var fn = this.createFunctionContext(asObject);
    if (!this.isChild) {
      var ret = {
        compiler: this.compilerInfo(),
        main: fn
      };

      if (this.decorators) {
        ret.main_d = this.decorators; // eslint-disable-line camelcase
        ret.useDecorators = true;
      }

      var _context = this.context;
      var programs = _context.programs;
      var decorators = _context.decorators;

      for (i = 0, l = programs.length; i < l; i++) {
        if (programs[i]) {
          ret[i] = programs[i];
          if (decorators[i]) {
            ret[i + '_d'] = decorators[i];
            ret.useDecorators = true;
          }
        }
      }

      if (this.environment.usePartial) {
        ret.usePartial = true;
      }
      if (this.options.data) {
        ret.useData = true;
      }
      if (this.useDepths) {
        ret.useDepths = true;
      }
      if (this.useBlockParams) {
        ret.useBlockParams = true;
      }
      if (this.options.compat) {
        ret.compat = true;
      }

      if (!asObject) {
        ret.compiler = JSON.stringify(ret.compiler);

        this.source.currentLocation = { start: { line: 1, column: 0 } };
        ret = this.objectLiteral(ret);

        if (options.srcName) {
          ret = ret.toStringWithSourceMap({ file: options.destName });
          ret.map = ret.map && ret.map.toString();
        } else {
          ret = ret.toString();
        }
      } else {
        ret.compilerOptions = this.options;
      }

      return ret;
    } else {
      return fn;
    }
  },

  preamble: function preamble() {
    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = new _codeGen2['default'](this.options.srcName);
    this.decorators = new _codeGen2['default'](this.options.srcName);
  },

  createFunctionContext: function createFunctionContext(asObject) {
    var varDeclarations = '';

    var locals = this.stackVars.concat(this.registers.list);
    if (locals.length > 0) {
      varDeclarations += ', ' + locals.join(', ');
    }

    // Generate minimizer alias mappings
    //
    // When using true SourceNodes, this will update all references to the given alias
    // as the source nodes are reused in situ. For the non-source node compilation mode,
    // aliases will not be used, but this case is already being run on the client and
    // we aren't concern about minimizing the template size.
    var aliasCount = 0;
    for (var alias in this.aliases) {
      // eslint-disable-line guard-for-in
      var node = this.aliases[alias];

      if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
        varDeclarations += ', alias' + ++aliasCount + '=' + alias;
        node.children[0] = 'alias' + aliasCount;
      }
    }

    var params = ['container', 'depth0', 'helpers', 'partials', 'data'];

    if (this.useBlockParams || this.useDepths) {
      params.push('blockParams');
    }
    if (this.useDepths) {
      params.push('depths');
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource(varDeclarations);

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
    }
  },
  mergeSource: function mergeSource(varDeclarations) {
    var isSimple = this.environment.isSimple,
        appendOnly = !this.forceBuffer,
        appendFirst = undefined,
        sourceSeen = undefined,
        bufferStart = undefined,
        bufferEnd = undefined;
    this.source.each(function (line) {
      if (line.appendToBuffer) {
        if (bufferStart) {
          line.prepend('  + ');
        } else {
          bufferStart = line;
        }
        bufferEnd = line;
      } else {
        if (bufferStart) {
          if (!sourceSeen) {
            appendFirst = true;
          } else {
            bufferStart.prepend('buffer += ');
          }
          bufferEnd.add(';');
          bufferStart = bufferEnd = undefined;
        }

        sourceSeen = true;
        if (!isSimple) {
          appendOnly = false;
        }
      }
    });

    if (appendOnly) {
      if (bufferStart) {
        bufferStart.prepend('return ');
        bufferEnd.add(';');
      } else if (!sourceSeen) {
        this.source.push('return "";');
      }
    } else {
      varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

      if (bufferStart) {
        bufferStart.prepend('return buffer + ');
        bufferEnd.add(';');
      } else {
        this.source.push('return buffer;');
      }
    }

    if (varDeclarations) {
      this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
    }

    return this.source.merge();
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function blockValue(name) {
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs(name, 0, params);

    var blockName = this.popStack();
    params.splice(1, 0, blockName);

    this.push(this.source.functionCall(blockHelperMissing, 'call', params));
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function ambiguousBlockValue() {
    // We're being a bit cheeky and reusing the options value from the prior exec
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs('', 0, params, true);

    this.flushInline();

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function appendContent(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    } else {
      this.pendingLocation = this.source.currentLocation;
    }

    this.pendingContent = content;
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function append() {
    if (this.isInline()) {
      this.replaceStack(function (current) {
        return [' != null ? ', current, ' : ""'];
      });

      this.pushSource(this.appendToBuffer(this.popStack()));
    } else {
      var local = this.popStack();
      this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
      if (this.environment.isSimple) {
        this.pushSource(['else { ', this.appendToBuffer("''", undefined, true), ' }']);
      }
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function appendEscaped() {
    this.pushSource(this.appendToBuffer([this.aliasable('container.escapeExpression'), '(', this.popStack(), ')']));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function getContext(depth) {
    this.lastContext = depth;
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function pushContext() {
    this.pushStackLiteral(this.contextName(this.lastContext));
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function lookupOnContext(parts, falsy, strict, scoped) {
    var i = 0;

    if (!scoped && this.options.compat && !this.lastContext) {
      // The depthed query is expected to handle the undefined logic for the root level that
      // is implemented below, so we evaluate that directly in compat mode
      this.push(this.depthedLookup(parts[i++]));
    } else {
      this.pushContext();
    }

    this.resolvePath('context', parts, i, falsy, strict);
  },

  // [lookupBlockParam]
  //
  // On stack, before: ...
  // On stack, after: blockParam[name], ...
  //
  // Looks up the value of `parts` on the given block param and pushes
  // it onto the stack.
  lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
    this.useBlockParams = true;

    this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
    this.resolvePath('context', parts, 1);
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function lookupData(depth, parts, strict) {
    if (!depth) {
      this.pushStackLiteral('data');
    } else {
      this.pushStackLiteral('container.data(data, ' + depth + ')');
    }

    this.resolvePath('data', parts, 0, true, strict);
  },

  resolvePath: function resolvePath(type, parts, i, falsy, strict) {
    // istanbul ignore next

    var _this = this;

    if (this.options.strict || this.options.assumeObjects) {
      this.push(strictLookup(this.options.strict && strict, this, parts, type));
      return;
    }

    var len = parts.length;
    for (; i < len; i++) {
      /* eslint-disable no-loop-func */
      this.replaceStack(function (current) {
        var lookup = _this.nameLookup(current, parts[i], type);
        // We want to ensure that zero and false are handled properly if the context (falsy flag)
        // needs to have the special handling for these values.
        if (!falsy) {
          return [' != null ? ', lookup, ' : ', current];
        } else {
          // Otherwise we can use generic falsy handling
          return [' && ', lookup];
        }
      });
      /* eslint-enable no-loop-func */
    }
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function resolvePossibleLambda() {
    this.push([this.aliasable('container.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function pushStringParam(string, type) {
    this.pushContext();
    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'SubExpression') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function emptyHash(omitEmpty) {
    if (this.trackIds) {
      this.push('{}'); // hashIds
    }
    if (this.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
    this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
  },
  pushHash: function pushHash() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = { values: [], types: [], contexts: [], ids: [] };
  },
  popHash: function popHash() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.trackIds) {
      this.push(this.objectLiteral(hash.ids));
    }
    if (this.stringParams) {
      this.push(this.objectLiteral(hash.contexts));
      this.push(this.objectLiteral(hash.types));
    }

    this.push(this.objectLiteral(hash.values));
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function pushString(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function pushLiteral(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function pushProgram(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [registerDecorator]
  //
  // On stack, before: hash, program, params..., ...
  // On stack, after: ...
  //
  // Pops off the decorator's parameters, invokes the decorator,
  // and inserts the decorator into the decorators list.
  registerDecorator: function registerDecorator(paramSize, name) {
    var foundDecorator = this.nameLookup('decorators', name, 'decorator'),
        options = this.setupHelperArgs(name, paramSize);

    this.decorators.push(['fn = ', this.decorators.functionCall(foundDecorator, '', ['fn', 'props', 'container', options]), ' || fn;']);
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function invokeHelper(paramSize, name, isSimple) {
    var nonHelper = this.popStack(),
        helper = this.setupHelper(paramSize, name),
        simple = isSimple ? [helper.name, ' || '] : '';

    var lookup = ['('].concat(simple, nonHelper);
    if (!this.options.strict) {
      lookup.push(' || ', this.aliasable('helpers.helperMissing'));
    }
    lookup.push(')');

    this.push(this.source.functionCall(lookup, 'call', helper.callParams));
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
    this.useRegister('helper');

    var nonHelper = this.popStack();

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
    if (!this.options.strict) {
      lookup[0] = '(helper = ';
      lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
    }

    this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function invokePartial(isDynamic, name, indent) {
    var params = [],
        options = this.setupParams(name, 1, params);

    if (isDynamic) {
      name = this.popStack();
      delete options.name;
    }

    if (indent) {
      options.indent = JSON.stringify(indent);
    }
    options.helpers = 'helpers';
    options.partials = 'partials';
    options.decorators = 'container.decorators';

    if (!isDynamic) {
      params.unshift(this.nameLookup('partials', name, 'partial'));
    } else {
      params.unshift(name);
    }

    if (this.options.compat) {
      options.depths = 'depths';
    }
    options = this.objectLiteral(options);
    params.push(options);

    this.push(this.source.functionCall('container.invokePartial', '', params));
  },

  // [assignToHash]
  //
  // On stack, before: value, ..., hash, ...
  // On stack, after: ..., hash, ...
  //
  // Pops a value off the stack and assigns it to the current hash
  assignToHash: function assignToHash(key) {
    var value = this.popStack(),
        context = undefined,
        type = undefined,
        id = undefined;

    if (this.trackIds) {
      id = this.popStack();
    }
    if (this.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts[key] = context;
    }
    if (type) {
      hash.types[key] = type;
    }
    if (id) {
      hash.ids[key] = id;
    }
    hash.values[key] = value;
  },

  pushId: function pushId(type, name, child) {
    if (type === 'BlockParam') {
      this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
    } else if (type === 'PathExpression') {
      this.pushString(name);
    } else if (type === 'SubExpression') {
      this.pushStackLiteral('true');
    } else {
      this.pushStackLiteral('null');
    }
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function compileChildren(environment, options) {
    var children = environment.children,
        child = undefined,
        compiler = undefined;

    for (var i = 0, l = children.length; i < l; i++) {
      child = children[i];
      compiler = new this.compiler(); // eslint-disable-line new-cap

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
        this.context.decorators[index] = compiler.decorators;
        this.context.environments[index] = child;

        this.useDepths = this.useDepths || compiler.useDepths;
        this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
      } else {
        child.index = index;
        child.name = 'program' + index;

        this.useDepths = this.useDepths || child.useDepths;
        this.useBlockParams = this.useBlockParams || child.useBlockParams;
      }
    }
  },
  matchExistingProgram: function matchExistingProgram(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function programExpression(guid) {
    var child = this.environment.children[guid],
        programParams = [child.index, 'data', child.blockParams];

    if (this.useBlockParams || this.useDepths) {
      programParams.push('blockParams');
    }
    if (this.useDepths) {
      programParams.push('depths');
    }

    return 'container.program(' + programParams.join(', ') + ')';
  },

  useRegister: function useRegister(name) {
    if (!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  push: function push(expr) {
    if (!(expr instanceof Literal)) {
      expr = this.source.wrap(expr);
    }

    this.inlineStack.push(expr);
    return expr;
  },

  pushStackLiteral: function pushStackLiteral(item) {
    this.push(new Literal(item));
  },

  pushSource: function pushSource(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  replaceStack: function replaceStack(callback) {
    var prefix = ['('],
        stack = undefined,
        createdStack = undefined,
        usedLiteral = undefined;

    /* istanbul ignore next */
    if (!this.isInline()) {
      throw new _exception2['default']('replaceStack on non-inline');
    }

    // We want to merge the inline statement into the replacement statement via ','
    var top = this.popStack(true);

    if (top instanceof Literal) {
      // Literals do not need to be inlined
      stack = [top.value];
      prefix = ['(', stack];
      usedLiteral = true;
    } else {
      // Get or create the current stack name for use by the inline
      createdStack = true;
      var _name = this.incrStack();

      prefix = ['((', this.push(_name), ' = ', top, ')'];
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (!usedLiteral) {
      this.popStack();
    }
    if (createdStack) {
      this.stackSlot--;
    }
    this.push(prefix.concat(item, ')'));
  },

  incrStack: function incrStack() {
    this.stackSlot++;
    if (this.stackSlot > this.stackVars.length) {
      this.stackVars.push('stack' + this.stackSlot);
    }
    return this.topStackName();
  },
  topStackName: function topStackName() {
    return 'stack' + this.stackSlot;
  },
  flushInline: function flushInline() {
    var inlineStack = this.inlineStack;
    this.inlineStack = [];
    for (var i = 0, len = inlineStack.length; i < len; i++) {
      var entry = inlineStack[i];
      /* istanbul ignore if */
      if (entry instanceof Literal) {
        this.compileStack.push(entry);
      } else {
        var stack = this.incrStack();
        this.pushSource([stack, ' = ', entry, ';']);
        this.compileStack.push(stack);
      }
    }
  },
  isInline: function isInline() {
    return this.inlineStack.length;
  },

  popStack: function popStack(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && item instanceof Literal) {
      return item.value;
    } else {
      if (!inline) {
        /* istanbul ignore next */
        if (!this.stackSlot) {
          throw new _exception2['default']('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function topStack() {
    var stack = this.isInline() ? this.inlineStack : this.compileStack,
        item = stack[stack.length - 1];

    /* istanbul ignore if */
    if (item instanceof Literal) {
      return item.value;
    } else {
      return item;
    }
  },

  contextName: function contextName(context) {
    if (this.useDepths && context) {
      return 'depths[' + context + ']';
    } else {
      return 'depth' + context;
    }
  },

  quotedString: function quotedString(str) {
    return this.source.quotedString(str);
  },

  objectLiteral: function objectLiteral(obj) {
    return this.source.objectLiteral(obj);
  },

  aliasable: function aliasable(name) {
    var ret = this.aliases[name];
    if (ret) {
      ret.referenceCount++;
      return ret;
    }

    ret = this.aliases[name] = this.source.wrap(name);
    ret.aliasable = true;
    ret.referenceCount = 1;

    return ret;
  },

  setupHelper: function setupHelper(paramSize, name, blockHelper) {
    var params = [],
        paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
    var foundHelper = this.nameLookup('helpers', name, 'helper'),
        callContext = this.aliasable(this.contextName(0) + ' != null ? ' + this.contextName(0) + ' : {}');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: [callContext].concat(params)
    };
  },

  setupParams: function setupParams(helper, paramSize, params) {
    var options = {},
        contexts = [],
        types = [],
        ids = [],
        objectArgs = !params,
        param = undefined;

    if (objectArgs) {
      params = [];
    }

    options.name = this.quotedString(helper);
    options.hash = this.popStack();

    if (this.trackIds) {
      options.hashIds = this.popStack();
    }
    if (this.stringParams) {
      options.hashTypes = this.popStack();
      options.hashContexts = this.popStack();
    }

    var inverse = this.popStack(),
        program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      options.fn = program || 'container.noop';
      options.inverse = inverse || 'container.noop';
    }

    // The parameters go on to the stack in order (making sure that they are evaluated in order)
    // so we need to pop them off the stack in reverse order
    var i = paramSize;
    while (i--) {
      param = this.popStack();
      params[i] = param;

      if (this.trackIds) {
        ids[i] = this.popStack();
      }
      if (this.stringParams) {
        types[i] = this.popStack();
        contexts[i] = this.popStack();
      }
    }

    if (objectArgs) {
      options.args = this.source.generateArray(params);
    }

    if (this.trackIds) {
      options.ids = this.source.generateArray(ids);
    }
    if (this.stringParams) {
      options.types = this.source.generateArray(types);
      options.contexts = this.source.generateArray(contexts);
    }

    if (this.options.data) {
      options.data = 'data';
    }
    if (this.useBlockParams) {
      options.blockParams = 'blockParams';
    }
    return options;
  },

  setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
    var options = this.setupParams(helper, paramSize, params);
    options = this.objectLiteral(options);
    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return ['options=', options];
    } else if (params) {
      params.push(options);
      return '';
    } else {
      return options;
    }
  }
};

(function () {
  var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for (var i = 0, l = reservedWords.length; i < l; i++) {
    compilerWords[reservedWords[i]] = true;
  }
})();

JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
};

function strictLookup(requireTerminal, compiler, parts, type) {
  var stack = compiler.popStack(),
      i = 0,
      len = parts.length;
  if (requireTerminal) {
    len--;
  }

  for (; i < len; i++) {
    stack = compiler.nameLookup(stack, parts[i], type);
  }

  if (requireTerminal) {
    return [compiler.aliasable('container.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
  } else {
    return stack;
  }
}

exports['default'] = JavaScriptCompiler;
module.exports = exports['default'];


},{"../base":18,"../exception":31,"../utils":44,"./code-gen":21}],25:[function(require,module,exports){
/* istanbul ignore next */
/* Jison generated parser */
"use strict";

var handlebars = (function () {
    var parser = { trace: function trace() {},
        yy: {},
        symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition_plus0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "mustache_repetition0": 49, "mustache_option0": 50, "OPEN_UNESCAPED": 51, "mustache_repetition1": 52, "mustache_option1": 53, "CLOSE_UNESCAPED": 54, "OPEN_PARTIAL": 55, "partialName": 56, "partial_repetition0": 57, "partial_option0": 58, "openPartialBlock": 59, "OPEN_PARTIAL_BLOCK": 60, "openPartialBlock_repetition0": 61, "openPartialBlock_option0": 62, "param": 63, "sexpr": 64, "OPEN_SEXPR": 65, "sexpr_repetition0": 66, "sexpr_option0": 67, "CLOSE_SEXPR": 68, "hash": 69, "hash_repetition_plus0": 70, "hashSegment": 71, "ID": 72, "EQUALS": 73, "blockParams": 74, "OPEN_BLOCK_PARAMS": 75, "blockParams_repetition_plus0": 76, "CLOSE_BLOCK_PARAMS": 77, "path": 78, "dataName": 79, "STRING": 80, "NUMBER": 81, "BOOLEAN": 82, "UNDEFINED": 83, "NULL": 84, "DATA": 85, "pathSegments": 86, "SEP": 87, "$accept": 0, "$end": 1 },
        terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 51: "OPEN_UNESCAPED", 54: "CLOSE_UNESCAPED", 55: "OPEN_PARTIAL", 60: "OPEN_PARTIAL_BLOCK", 65: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 72: "ID", 73: "EQUALS", 75: "OPEN_BLOCK_PARAMS", 77: "CLOSE_BLOCK_PARAMS", 80: "STRING", 81: "NUMBER", 82: "BOOLEAN", 83: "UNDEFINED", 84: "NULL", 85: "DATA", 87: "SEP" },
        productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 5], [8, 5], [11, 5], [12, 3], [59, 5], [63, 1], [63, 1], [64, 5], [69, 1], [71, 3], [74, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [56, 1], [56, 1], [79, 2], [78, 1], [86, 3], [86, 1], [6, 0], [6, 2], [17, 1], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [49, 0], [49, 2], [50, 0], [50, 1], [52, 0], [52, 2], [53, 0], [53, 1], [57, 0], [57, 2], [58, 0], [58, 1], [61, 0], [61, 2], [62, 0], [62, 1], [66, 0], [66, 2], [67, 0], [67, 1], [70, 1], [70, 2], [76, 1], [76, 2]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$
        /**/) {

            var $0 = $$.length - 1;
            switch (yystate) {
                case 1:
                    return $$[$0 - 1];
                    break;
                case 2:
                    this.$ = yy.prepareProgram($$[$0]);
                    break;
                case 3:
                    this.$ = $$[$0];
                    break;
                case 4:
                    this.$ = $$[$0];
                    break;
                case 5:
                    this.$ = $$[$0];
                    break;
                case 6:
                    this.$ = $$[$0];
                    break;
                case 7:
                    this.$ = $$[$0];
                    break;
                case 8:
                    this.$ = $$[$0];
                    break;
                case 9:
                    this.$ = {
                        type: 'CommentStatement',
                        value: yy.stripComment($$[$0]),
                        strip: yy.stripFlags($$[$0], $$[$0]),
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 10:
                    this.$ = {
                        type: 'ContentStatement',
                        original: $$[$0],
                        value: $$[$0],
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 11:
                    this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 12:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
                    break;
                case 13:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                    break;
                case 14:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                    break;
                case 15:
                    this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 16:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 17:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 18:
                    this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
                    break;
                case 19:
                    var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                        program = yy.prepareProgram([inverse], $$[$0 - 1].loc);
                    program.chained = true;

                    this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

                    break;
                case 20:
                    this.$ = $$[$0];
                    break;
                case 21:
                    this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
                    break;
                case 22:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 23:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 24:
                    this.$ = {
                        type: 'PartialStatement',
                        name: $$[$0 - 3],
                        params: $$[$0 - 2],
                        hash: $$[$0 - 1],
                        indent: '',
                        strip: yy.stripFlags($$[$0 - 4], $$[$0]),
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 25:
                    this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 26:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
                    break;
                case 27:
                    this.$ = $$[$0];
                    break;
                case 28:
                    this.$ = $$[$0];
                    break;
                case 29:
                    this.$ = {
                        type: 'SubExpression',
                        path: $$[$0 - 3],
                        params: $$[$0 - 2],
                        hash: $$[$0 - 1],
                        loc: yy.locInfo(this._$)
                    };

                    break;
                case 30:
                    this.$ = { type: 'Hash', pairs: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 31:
                    this.$ = { type: 'HashPair', key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 32:
                    this.$ = yy.id($$[$0 - 1]);
                    break;
                case 33:
                    this.$ = $$[$0];
                    break;
                case 34:
                    this.$ = $$[$0];
                    break;
                case 35:
                    this.$ = { type: 'StringLiteral', value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
                    break;
                case 36:
                    this.$ = { type: 'NumberLiteral', value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
                    break;
                case 37:
                    this.$ = { type: 'BooleanLiteral', value: $$[$0] === 'true', original: $$[$0] === 'true', loc: yy.locInfo(this._$) };
                    break;
                case 38:
                    this.$ = { type: 'UndefinedLiteral', original: undefined, value: undefined, loc: yy.locInfo(this._$) };
                    break;
                case 39:
                    this.$ = { type: 'NullLiteral', original: null, value: null, loc: yy.locInfo(this._$) };
                    break;
                case 40:
                    this.$ = $$[$0];
                    break;
                case 41:
                    this.$ = $$[$0];
                    break;
                case 42:
                    this.$ = yy.preparePath(true, $$[$0], this._$);
                    break;
                case 43:
                    this.$ = yy.preparePath(false, $$[$0], this._$);
                    break;
                case 44:
                    $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
                    break;
                case 45:
                    this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
                    break;
                case 46:
                    this.$ = [];
                    break;
                case 47:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 48:
                    this.$ = [$$[$0]];
                    break;
                case 49:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 50:
                    this.$ = [];
                    break;
                case 51:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 58:
                    this.$ = [];
                    break;
                case 59:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 64:
                    this.$ = [];
                    break;
                case 65:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 70:
                    this.$ = [];
                    break;
                case 71:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 78:
                    this.$ = [];
                    break;
                case 79:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 82:
                    this.$ = [];
                    break;
                case 83:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 86:
                    this.$ = [];
                    break;
                case 87:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 90:
                    this.$ = [];
                    break;
                case 91:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 94:
                    this.$ = [];
                    break;
                case 95:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 98:
                    this.$ = [$$[$0]];
                    break;
                case 99:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 100:
                    this.$ = [$$[$0]];
                    break;
                case 101:
                    $$[$0 - 1].push($$[$0]);
                    break;
            }
        },
        table: [{ 3: 1, 4: 2, 5: [2, 46], 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: [1, 12], 15: [1, 20], 16: 17, 19: [1, 23], 24: 15, 27: 16, 29: [1, 21], 34: [1, 22], 39: [2, 2], 44: [2, 2], 47: [2, 2], 48: [1, 13], 51: [1, 14], 55: [1, 18], 59: 19, 60: [1, 24] }, { 1: [2, 1] }, { 5: [2, 47], 14: [2, 47], 15: [2, 47], 19: [2, 47], 29: [2, 47], 34: [2, 47], 39: [2, 47], 44: [2, 47], 47: [2, 47], 48: [2, 47], 51: [2, 47], 55: [2, 47], 60: [2, 47] }, { 5: [2, 3], 14: [2, 3], 15: [2, 3], 19: [2, 3], 29: [2, 3], 34: [2, 3], 39: [2, 3], 44: [2, 3], 47: [2, 3], 48: [2, 3], 51: [2, 3], 55: [2, 3], 60: [2, 3] }, { 5: [2, 4], 14: [2, 4], 15: [2, 4], 19: [2, 4], 29: [2, 4], 34: [2, 4], 39: [2, 4], 44: [2, 4], 47: [2, 4], 48: [2, 4], 51: [2, 4], 55: [2, 4], 60: [2, 4] }, { 5: [2, 5], 14: [2, 5], 15: [2, 5], 19: [2, 5], 29: [2, 5], 34: [2, 5], 39: [2, 5], 44: [2, 5], 47: [2, 5], 48: [2, 5], 51: [2, 5], 55: [2, 5], 60: [2, 5] }, { 5: [2, 6], 14: [2, 6], 15: [2, 6], 19: [2, 6], 29: [2, 6], 34: [2, 6], 39: [2, 6], 44: [2, 6], 47: [2, 6], 48: [2, 6], 51: [2, 6], 55: [2, 6], 60: [2, 6] }, { 5: [2, 7], 14: [2, 7], 15: [2, 7], 19: [2, 7], 29: [2, 7], 34: [2, 7], 39: [2, 7], 44: [2, 7], 47: [2, 7], 48: [2, 7], 51: [2, 7], 55: [2, 7], 60: [2, 7] }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 19: [2, 8], 29: [2, 8], 34: [2, 8], 39: [2, 8], 44: [2, 8], 47: [2, 8], 48: [2, 8], 51: [2, 8], 55: [2, 8], 60: [2, 8] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 19: [2, 9], 29: [2, 9], 34: [2, 9], 39: [2, 9], 44: [2, 9], 47: [2, 9], 48: [2, 9], 51: [2, 9], 55: [2, 9], 60: [2, 9] }, { 20: 25, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 36, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 37, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 4: 38, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 13: 40, 15: [1, 20], 17: 39 }, { 20: 42, 56: 41, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 45, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 18: [2, 10], 19: [2, 10], 29: [2, 10], 34: [2, 10], 39: [2, 10], 44: [2, 10], 47: [2, 10], 48: [2, 10], 51: [2, 10], 55: [2, 10], 60: [2, 10] }, { 20: 46, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 47, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 48, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 42, 56: 49, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [2, 78], 49: 50, 65: [2, 78], 72: [2, 78], 80: [2, 78], 81: [2, 78], 82: [2, 78], 83: [2, 78], 84: [2, 78], 85: [2, 78] }, { 23: [2, 33], 33: [2, 33], 54: [2, 33], 65: [2, 33], 68: [2, 33], 72: [2, 33], 75: [2, 33], 80: [2, 33], 81: [2, 33], 82: [2, 33], 83: [2, 33], 84: [2, 33], 85: [2, 33] }, { 23: [2, 34], 33: [2, 34], 54: [2, 34], 65: [2, 34], 68: [2, 34], 72: [2, 34], 75: [2, 34], 80: [2, 34], 81: [2, 34], 82: [2, 34], 83: [2, 34], 84: [2, 34], 85: [2, 34] }, { 23: [2, 35], 33: [2, 35], 54: [2, 35], 65: [2, 35], 68: [2, 35], 72: [2, 35], 75: [2, 35], 80: [2, 35], 81: [2, 35], 82: [2, 35], 83: [2, 35], 84: [2, 35], 85: [2, 35] }, { 23: [2, 36], 33: [2, 36], 54: [2, 36], 65: [2, 36], 68: [2, 36], 72: [2, 36], 75: [2, 36], 80: [2, 36], 81: [2, 36], 82: [2, 36], 83: [2, 36], 84: [2, 36], 85: [2, 36] }, { 23: [2, 37], 33: [2, 37], 54: [2, 37], 65: [2, 37], 68: [2, 37], 72: [2, 37], 75: [2, 37], 80: [2, 37], 81: [2, 37], 82: [2, 37], 83: [2, 37], 84: [2, 37], 85: [2, 37] }, { 23: [2, 38], 33: [2, 38], 54: [2, 38], 65: [2, 38], 68: [2, 38], 72: [2, 38], 75: [2, 38], 80: [2, 38], 81: [2, 38], 82: [2, 38], 83: [2, 38], 84: [2, 38], 85: [2, 38] }, { 23: [2, 39], 33: [2, 39], 54: [2, 39], 65: [2, 39], 68: [2, 39], 72: [2, 39], 75: [2, 39], 80: [2, 39], 81: [2, 39], 82: [2, 39], 83: [2, 39], 84: [2, 39], 85: [2, 39] }, { 23: [2, 43], 33: [2, 43], 54: [2, 43], 65: [2, 43], 68: [2, 43], 72: [2, 43], 75: [2, 43], 80: [2, 43], 81: [2, 43], 82: [2, 43], 83: [2, 43], 84: [2, 43], 85: [2, 43], 87: [1, 51] }, { 72: [1, 35], 86: 52 }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 52: 53, 54: [2, 82], 65: [2, 82], 72: [2, 82], 80: [2, 82], 81: [2, 82], 82: [2, 82], 83: [2, 82], 84: [2, 82], 85: [2, 82] }, { 25: 54, 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 55, 47: [2, 54] }, { 28: 60, 43: 61, 44: [1, 59], 47: [2, 56] }, { 13: 63, 15: [1, 20], 18: [1, 62] }, { 15: [2, 48], 18: [2, 48] }, { 33: [2, 86], 57: 64, 65: [2, 86], 72: [2, 86], 80: [2, 86], 81: [2, 86], 82: [2, 86], 83: [2, 86], 84: [2, 86], 85: [2, 86] }, { 33: [2, 40], 65: [2, 40], 72: [2, 40], 80: [2, 40], 81: [2, 40], 82: [2, 40], 83: [2, 40], 84: [2, 40], 85: [2, 40] }, { 33: [2, 41], 65: [2, 41], 72: [2, 41], 80: [2, 41], 81: [2, 41], 82: [2, 41], 83: [2, 41], 84: [2, 41], 85: [2, 41] }, { 20: 65, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 66, 47: [1, 67] }, { 30: 68, 33: [2, 58], 65: [2, 58], 72: [2, 58], 75: [2, 58], 80: [2, 58], 81: [2, 58], 82: [2, 58], 83: [2, 58], 84: [2, 58], 85: [2, 58] }, { 33: [2, 64], 35: 69, 65: [2, 64], 72: [2, 64], 75: [2, 64], 80: [2, 64], 81: [2, 64], 82: [2, 64], 83: [2, 64], 84: [2, 64], 85: [2, 64] }, { 21: 70, 23: [2, 50], 65: [2, 50], 72: [2, 50], 80: [2, 50], 81: [2, 50], 82: [2, 50], 83: [2, 50], 84: [2, 50], 85: [2, 50] }, { 33: [2, 90], 61: 71, 65: [2, 90], 72: [2, 90], 80: [2, 90], 81: [2, 90], 82: [2, 90], 83: [2, 90], 84: [2, 90], 85: [2, 90] }, { 20: 75, 33: [2, 80], 50: 72, 63: 73, 64: 76, 65: [1, 44], 69: 74, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 72: [1, 80] }, { 23: [2, 42], 33: [2, 42], 54: [2, 42], 65: [2, 42], 68: [2, 42], 72: [2, 42], 75: [2, 42], 80: [2, 42], 81: [2, 42], 82: [2, 42], 83: [2, 42], 84: [2, 42], 85: [2, 42], 87: [1, 51] }, { 20: 75, 53: 81, 54: [2, 84], 63: 82, 64: 76, 65: [1, 44], 69: 83, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 84, 47: [1, 67] }, { 47: [2, 55] }, { 4: 85, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 47: [2, 20] }, { 20: 86, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 87, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 26: 88, 47: [1, 67] }, { 47: [2, 57] }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 19: [2, 11], 29: [2, 11], 34: [2, 11], 39: [2, 11], 44: [2, 11], 47: [2, 11], 48: [2, 11], 51: [2, 11], 55: [2, 11], 60: [2, 11] }, { 15: [2, 49], 18: [2, 49] }, { 20: 75, 33: [2, 88], 58: 89, 63: 90, 64: 76, 65: [1, 44], 69: 91, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 65: [2, 94], 66: 92, 68: [2, 94], 72: [2, 94], 80: [2, 94], 81: [2, 94], 82: [2, 94], 83: [2, 94], 84: [2, 94], 85: [2, 94] }, { 5: [2, 25], 14: [2, 25], 15: [2, 25], 19: [2, 25], 29: [2, 25], 34: [2, 25], 39: [2, 25], 44: [2, 25], 47: [2, 25], 48: [2, 25], 51: [2, 25], 55: [2, 25], 60: [2, 25] }, { 20: 93, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 31: 94, 33: [2, 60], 63: 95, 64: 76, 65: [1, 44], 69: 96, 70: 77, 71: 78, 72: [1, 79], 75: [2, 60], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 66], 36: 97, 63: 98, 64: 76, 65: [1, 44], 69: 99, 70: 77, 71: 78, 72: [1, 79], 75: [2, 66], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 22: 100, 23: [2, 52], 63: 101, 64: 76, 65: [1, 44], 69: 102, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 92], 62: 103, 63: 104, 64: 76, 65: [1, 44], 69: 105, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 106] }, { 33: [2, 79], 65: [2, 79], 72: [2, 79], 80: [2, 79], 81: [2, 79], 82: [2, 79], 83: [2, 79], 84: [2, 79], 85: [2, 79] }, { 33: [2, 81] }, { 23: [2, 27], 33: [2, 27], 54: [2, 27], 65: [2, 27], 68: [2, 27], 72: [2, 27], 75: [2, 27], 80: [2, 27], 81: [2, 27], 82: [2, 27], 83: [2, 27], 84: [2, 27], 85: [2, 27] }, { 23: [2, 28], 33: [2, 28], 54: [2, 28], 65: [2, 28], 68: [2, 28], 72: [2, 28], 75: [2, 28], 80: [2, 28], 81: [2, 28], 82: [2, 28], 83: [2, 28], 84: [2, 28], 85: [2, 28] }, { 23: [2, 30], 33: [2, 30], 54: [2, 30], 68: [2, 30], 71: 107, 72: [1, 108], 75: [2, 30] }, { 23: [2, 98], 33: [2, 98], 54: [2, 98], 68: [2, 98], 72: [2, 98], 75: [2, 98] }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 73: [1, 109], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 23: [2, 44], 33: [2, 44], 54: [2, 44], 65: [2, 44], 68: [2, 44], 72: [2, 44], 75: [2, 44], 80: [2, 44], 81: [2, 44], 82: [2, 44], 83: [2, 44], 84: [2, 44], 85: [2, 44], 87: [2, 44] }, { 54: [1, 110] }, { 54: [2, 83], 65: [2, 83], 72: [2, 83], 80: [2, 83], 81: [2, 83], 82: [2, 83], 83: [2, 83], 84: [2, 83], 85: [2, 83] }, { 54: [2, 85] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 19: [2, 13], 29: [2, 13], 34: [2, 13], 39: [2, 13], 44: [2, 13], 47: [2, 13], 48: [2, 13], 51: [2, 13], 55: [2, 13], 60: [2, 13] }, { 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 112, 46: 111, 47: [2, 76] }, { 33: [2, 70], 40: 113, 65: [2, 70], 72: [2, 70], 75: [2, 70], 80: [2, 70], 81: [2, 70], 82: [2, 70], 83: [2, 70], 84: [2, 70], 85: [2, 70] }, { 47: [2, 18] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 19: [2, 14], 29: [2, 14], 34: [2, 14], 39: [2, 14], 44: [2, 14], 47: [2, 14], 48: [2, 14], 51: [2, 14], 55: [2, 14], 60: [2, 14] }, { 33: [1, 114] }, { 33: [2, 87], 65: [2, 87], 72: [2, 87], 80: [2, 87], 81: [2, 87], 82: [2, 87], 83: [2, 87], 84: [2, 87], 85: [2, 87] }, { 33: [2, 89] }, { 20: 75, 63: 116, 64: 76, 65: [1, 44], 67: 115, 68: [2, 96], 69: 117, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 118] }, { 32: 119, 33: [2, 62], 74: 120, 75: [1, 121] }, { 33: [2, 59], 65: [2, 59], 72: [2, 59], 75: [2, 59], 80: [2, 59], 81: [2, 59], 82: [2, 59], 83: [2, 59], 84: [2, 59], 85: [2, 59] }, { 33: [2, 61], 75: [2, 61] }, { 33: [2, 68], 37: 122, 74: 123, 75: [1, 121] }, { 33: [2, 65], 65: [2, 65], 72: [2, 65], 75: [2, 65], 80: [2, 65], 81: [2, 65], 82: [2, 65], 83: [2, 65], 84: [2, 65], 85: [2, 65] }, { 33: [2, 67], 75: [2, 67] }, { 23: [1, 124] }, { 23: [2, 51], 65: [2, 51], 72: [2, 51], 80: [2, 51], 81: [2, 51], 82: [2, 51], 83: [2, 51], 84: [2, 51], 85: [2, 51] }, { 23: [2, 53] }, { 33: [1, 125] }, { 33: [2, 91], 65: [2, 91], 72: [2, 91], 80: [2, 91], 81: [2, 91], 82: [2, 91], 83: [2, 91], 84: [2, 91], 85: [2, 91] }, { 33: [2, 93] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 19: [2, 22], 29: [2, 22], 34: [2, 22], 39: [2, 22], 44: [2, 22], 47: [2, 22], 48: [2, 22], 51: [2, 22], 55: [2, 22], 60: [2, 22] }, { 23: [2, 99], 33: [2, 99], 54: [2, 99], 68: [2, 99], 72: [2, 99], 75: [2, 99] }, { 73: [1, 109] }, { 20: 75, 63: 126, 64: 76, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 19: [2, 23], 29: [2, 23], 34: [2, 23], 39: [2, 23], 44: [2, 23], 47: [2, 23], 48: [2, 23], 51: [2, 23], 55: [2, 23], 60: [2, 23] }, { 47: [2, 19] }, { 47: [2, 77] }, { 20: 75, 33: [2, 72], 41: 127, 63: 128, 64: 76, 65: [1, 44], 69: 129, 70: 77, 71: 78, 72: [1, 79], 75: [2, 72], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 24], 14: [2, 24], 15: [2, 24], 19: [2, 24], 29: [2, 24], 34: [2, 24], 39: [2, 24], 44: [2, 24], 47: [2, 24], 48: [2, 24], 51: [2, 24], 55: [2, 24], 60: [2, 24] }, { 68: [1, 130] }, { 65: [2, 95], 68: [2, 95], 72: [2, 95], 80: [2, 95], 81: [2, 95], 82: [2, 95], 83: [2, 95], 84: [2, 95], 85: [2, 95] }, { 68: [2, 97] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 19: [2, 21], 29: [2, 21], 34: [2, 21], 39: [2, 21], 44: [2, 21], 47: [2, 21], 48: [2, 21], 51: [2, 21], 55: [2, 21], 60: [2, 21] }, { 33: [1, 131] }, { 33: [2, 63] }, { 72: [1, 133], 76: 132 }, { 33: [1, 134] }, { 33: [2, 69] }, { 15: [2, 12] }, { 14: [2, 26], 15: [2, 26], 19: [2, 26], 29: [2, 26], 34: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 55: [2, 26], 60: [2, 26] }, { 23: [2, 31], 33: [2, 31], 54: [2, 31], 68: [2, 31], 72: [2, 31], 75: [2, 31] }, { 33: [2, 74], 42: 135, 74: 136, 75: [1, 121] }, { 33: [2, 71], 65: [2, 71], 72: [2, 71], 75: [2, 71], 80: [2, 71], 81: [2, 71], 82: [2, 71], 83: [2, 71], 84: [2, 71], 85: [2, 71] }, { 33: [2, 73], 75: [2, 73] }, { 23: [2, 29], 33: [2, 29], 54: [2, 29], 65: [2, 29], 68: [2, 29], 72: [2, 29], 75: [2, 29], 80: [2, 29], 81: [2, 29], 82: [2, 29], 83: [2, 29], 84: [2, 29], 85: [2, 29] }, { 14: [2, 15], 15: [2, 15], 19: [2, 15], 29: [2, 15], 34: [2, 15], 39: [2, 15], 44: [2, 15], 47: [2, 15], 48: [2, 15], 51: [2, 15], 55: [2, 15], 60: [2, 15] }, { 72: [1, 138], 77: [1, 137] }, { 72: [2, 100], 77: [2, 100] }, { 14: [2, 16], 15: [2, 16], 19: [2, 16], 29: [2, 16], 34: [2, 16], 44: [2, 16], 47: [2, 16], 48: [2, 16], 51: [2, 16], 55: [2, 16], 60: [2, 16] }, { 33: [1, 139] }, { 33: [2, 75] }, { 33: [2, 32] }, { 72: [2, 101], 77: [2, 101] }, { 14: [2, 17], 15: [2, 17], 19: [2, 17], 29: [2, 17], 34: [2, 17], 39: [2, 17], 44: [2, 17], 47: [2, 17], 48: [2, 17], 51: [2, 17], 55: [2, 17], 60: [2, 17] }],
        defaultActions: { 4: [2, 1], 55: [2, 55], 57: [2, 20], 61: [2, 57], 74: [2, 81], 83: [2, 85], 87: [2, 18], 91: [2, 89], 102: [2, 53], 105: [2, 93], 111: [2, 19], 112: [2, 77], 117: [2, 97], 120: [2, 63], 123: [2, 69], 124: [2, 12], 136: [2, 75], 137: [2, 32] },
        parseError: function parseError(str, hash) {
            throw new Error(str);
        },
        parse: function parse(input) {
            var self = this,
                stack = [0],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = "",
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            this.lexer.setInput(input);
            this.lexer.yy = this.yy;
            this.yy.lexer = this.lexer;
            this.yy.parser = this;
            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
            var yyloc = this.lexer.yylloc;
            lstack.push(yyloc);
            var ranges = this.lexer.options && this.lexer.options.ranges;
            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
            function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
            }
            function lex() {
                var token;
                token = self.lexer.lex() || 1;
                if (typeof token !== "number") {
                    token = self.symbols_[token] || token;
                }
                return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                    action = this.defaultActions[state];
                } else {
                    if (symbol === null || typeof symbol == "undefined") {
                        symbol = lex();
                    }
                    action = table[state] && table[state][symbol];
                }
                if (typeof action === "undefined" || !action.length || !action[0]) {
                    var errStr = "";
                    if (!recovering) {
                        expected = [];
                        for (p in table[state]) if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                        if (this.lexer.showPosition) {
                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                        } else {
                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                        }
                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                    }
                }
                if (action[0] instanceof Array && action.length > 1) {
                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                }
                switch (action[0]) {
                    case 1:
                        stack.push(symbol);
                        vstack.push(this.lexer.yytext);
                        lstack.push(this.lexer.yylloc);
                        stack.push(action[1]);
                        symbol = null;
                        if (!preErrorSymbol) {
                            yyleng = this.lexer.yyleng;
                            yytext = this.lexer.yytext;
                            yylineno = this.lexer.yylineno;
                            yyloc = this.lexer.yylloc;
                            if (recovering > 0) recovering--;
                        } else {
                            symbol = preErrorSymbol;
                            preErrorSymbol = null;
                        }
                        break;
                    case 2:
                        len = this.productions_[action[1]][1];
                        yyval.$ = vstack[vstack.length - len];
                        yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
                        if (ranges) {
                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                        }
                        r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                        if (typeof r !== "undefined") {
                            return r;
                        }
                        if (len) {
                            stack = stack.slice(0, -1 * len * 2);
                            vstack = vstack.slice(0, -1 * len);
                            lstack = lstack.slice(0, -1 * len);
                        }
                        stack.push(this.productions_[action[1]][0]);
                        vstack.push(yyval.$);
                        lstack.push(yyval._$);
                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case 3:
                        return true;
                }
            }
            return true;
        }
    };
    /* Jison generated lexer */
    var lexer = (function () {
        var lexer = { EOF: 1,
            parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                    this.yy.parser.parseError(str, hash);
                } else {
                    throw new Error(str);
                }
            },
            setInput: function setInput(input) {
                this._input = input;
                this._more = this._less = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = '';
                this.conditionStack = ['INITIAL'];
                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                if (this.options.ranges) this.yylloc.range = [0, 0];
                this.offset = 0;
                return this;
            },
            input: function input() {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno++;
                    this.yylloc.last_line++;
                } else {
                    this.yylloc.last_column++;
                }
                if (this.options.ranges) this.yylloc.range[1]++;

                this._input = this._input.slice(1);
                return ch;
            },
            unput: function unput(ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);

                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);

                if (lines.length - 1) this.yylineno -= lines.length - 1;
                var r = this.yylloc.range;

                this.yylloc = { first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };

                if (this.options.ranges) {
                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                return this;
            },
            more: function more() {
                this._more = true;
                return this;
            },
            less: function less(n) {
                this.unput(this.match.slice(n));
            },
            pastInput: function pastInput() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
            },
            upcomingInput: function upcomingInput() {
                var next = this.match;
                if (next.length < 20) {
                    next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
            },
            showPosition: function showPosition() {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },
            next: function next() {
                if (this.done) {
                    return this.EOF;
                }
                if (!this._input) this.done = true;

                var token, match, tempMatch, index, col, lines;
                if (!this._more) {
                    this.yytext = '';
                    this.match = '';
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                    tempMatch = this._input.match(this.rules[rules[i]]);
                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                        match = tempMatch;
                        index = i;
                        if (!this.options.flex) break;
                    }
                }
                if (match) {
                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                    if (lines) this.yylineno += lines.length;
                    this.yylloc = { first_line: this.yylloc.last_line,
                        last_line: this.yylineno + 1,
                        first_column: this.yylloc.last_column,
                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
                    this.yytext += match[0];
                    this.match += match[0];
                    this.matches = match;
                    this.yyleng = this.yytext.length;
                    if (this.options.ranges) {
                        this.yylloc.range = [this.offset, this.offset += this.yyleng];
                    }
                    this._more = false;
                    this._input = this._input.slice(match[0].length);
                    this.matched += match[0];
                    token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                    if (this.done && this._input) this.done = false;
                    if (token) return token;else return;
                }
                if (this._input === "") {
                    return this.EOF;
                } else {
                    return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), { text: "", token: null, line: this.yylineno });
                }
            },
            lex: function lex() {
                var r = this.next();
                if (typeof r !== 'undefined') {
                    return r;
                } else {
                    return this.lex();
                }
            },
            begin: function begin(condition) {
                this.conditionStack.push(condition);
            },
            popState: function popState() {
                return this.conditionStack.pop();
            },
            _currentRules: function _currentRules() {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            },
            topState: function topState() {
                return this.conditionStack[this.conditionStack.length - 2];
            },
            pushState: function begin(condition) {
                this.begin(condition);
            } };
        lexer.options = {};
        lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START
        /**/) {

            function strip(start, end) {
                return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
            }

            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
                case 0:
                    if (yy_.yytext.slice(-2) === "\\\\") {
                        strip(0, 1);
                        this.begin("mu");
                    } else if (yy_.yytext.slice(-1) === "\\") {
                        strip(0, 1);
                        this.begin("emu");
                    } else {
                        this.begin("mu");
                    }
                    if (yy_.yytext) return 15;

                    break;
                case 1:
                    return 15;
                    break;
                case 2:
                    this.popState();
                    return 15;

                    break;
                case 3:
                    this.begin('raw');return 15;
                    break;
                case 4:
                    this.popState();
                    // Should be using `this.topState()` below, but it currently
                    // returns the second top instead of the first top. Opened an
                    // issue about it at https://github.com/zaach/jison/issues/291
                    if (this.conditionStack[this.conditionStack.length - 1] === 'raw') {
                        return 15;
                    } else {
                        yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
                        return 'END_RAW_BLOCK';
                    }

                    break;
                case 5:
                    return 15;
                    break;
                case 6:
                    this.popState();
                    return 14;

                    break;
                case 7:
                    return 65;
                    break;
                case 8:
                    return 68;
                    break;
                case 9:
                    return 19;
                    break;
                case 10:
                    this.popState();
                    this.begin('raw');
                    return 23;

                    break;
                case 11:
                    return 55;
                    break;
                case 12:
                    return 60;
                    break;
                case 13:
                    return 29;
                    break;
                case 14:
                    return 47;
                    break;
                case 15:
                    this.popState();return 44;
                    break;
                case 16:
                    this.popState();return 44;
                    break;
                case 17:
                    return 34;
                    break;
                case 18:
                    return 39;
                    break;
                case 19:
                    return 51;
                    break;
                case 20:
                    return 48;
                    break;
                case 21:
                    this.unput(yy_.yytext);
                    this.popState();
                    this.begin('com');

                    break;
                case 22:
                    this.popState();
                    return 14;

                    break;
                case 23:
                    return 48;
                    break;
                case 24:
                    return 73;
                    break;
                case 25:
                    return 72;
                    break;
                case 26:
                    return 72;
                    break;
                case 27:
                    return 87;
                    break;
                case 28:
                    // ignore whitespace
                    break;
                case 29:
                    this.popState();return 54;
                    break;
                case 30:
                    this.popState();return 33;
                    break;
                case 31:
                    yy_.yytext = strip(1, 2).replace(/\\"/g, '"');return 80;
                    break;
                case 32:
                    yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 80;
                    break;
                case 33:
                    return 85;
                    break;
                case 34:
                    return 82;
                    break;
                case 35:
                    return 82;
                    break;
                case 36:
                    return 83;
                    break;
                case 37:
                    return 84;
                    break;
                case 38:
                    return 81;
                    break;
                case 39:
                    return 75;
                    break;
                case 40:
                    return 77;
                    break;
                case 41:
                    return 72;
                    break;
                case 42:
                    yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, '$1');return 72;
                    break;
                case 43:
                    return 'INVALID';
                    break;
                case 44:
                    return 5;
                    break;
            }
        };
        lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^\/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/];
        lexer.conditions = { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "INITIAL": { "rules": [0, 1, 44], "inclusive": true } };
        return lexer;
    })();
    parser.lexer = lexer;
    function Parser() {
        this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
})();exports.__esModule = true;
exports['default'] = handlebars;


},{}],26:[function(require,module,exports){
/* eslint-disable new-cap */
'use strict';

exports.__esModule = true;
exports.print = print;
exports.PrintVisitor = PrintVisitor;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _visitor = require('./visitor');

var _visitor2 = _interopRequireDefault(_visitor);

function print(ast) {
  return new PrintVisitor().accept(ast);
}

function PrintVisitor() {
  this.padding = 0;
}

PrintVisitor.prototype = new _visitor2['default']();

PrintVisitor.prototype.pad = function (string) {
  var out = '';

  for (var i = 0, l = this.padding; i < l; i++) {
    out += '  ';
  }

  out += string + '\n';
  return out;
};

PrintVisitor.prototype.Program = function (program) {
  var out = '',
      body = program.body,
      i = undefined,
      l = undefined;

  if (program.blockParams) {
    var blockParams = 'BLOCK PARAMS: [';
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += ' ' + program.blockParams[i];
    }
    blockParams += ' ]';
    out += this.pad(blockParams);
  }

  for (i = 0, l = body.length; i < l; i++) {
    out += this.accept(body[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.MustacheStatement = function (mustache) {
  return this.pad('{{ ' + this.SubExpression(mustache) + ' }}');
};
PrintVisitor.prototype.Decorator = function (mustache) {
  return this.pad('{{ DIRECTIVE ' + this.SubExpression(mustache) + ' }}');
};

PrintVisitor.prototype.BlockStatement = PrintVisitor.prototype.DecoratorBlock = function (block) {
  var out = '';

  out += this.pad((block.type === 'DecoratorBlock' ? 'DIRECTIVE ' : '') + 'BLOCK:');
  this.padding++;
  out += this.pad(this.SubExpression(block));
  if (block.program) {
    out += this.pad('PROGRAM:');
    this.padding++;
    out += this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) {
      this.padding++;
    }
    out += this.pad('{{^}}');
    this.padding++;
    out += this.accept(block.inverse);
    this.padding--;
    if (block.program) {
      this.padding--;
    }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.PartialStatement = function (partial) {
  var content = 'PARTIAL:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }
  return this.pad('{{> ' + content + ' }}');
};
PrintVisitor.prototype.PartialBlockStatement = function (partial) {
  var content = 'PARTIAL BLOCK:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }

  content += ' ' + this.pad('PROGRAM:');
  this.padding++;
  content += this.accept(partial.program);
  this.padding--;

  return this.pad('{{> ' + content + ' }}');
};

PrintVisitor.prototype.ContentStatement = function (content) {
  return this.pad("CONTENT[ '" + content.value + "' ]");
};

PrintVisitor.prototype.CommentStatement = function (comment) {
  return this.pad("{{! '" + comment.value + "' }}");
};

PrintVisitor.prototype.SubExpression = function (sexpr) {
  var params = sexpr.params,
      paramStrings = [],
      hash = undefined;

  for (var i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = '[' + paramStrings.join(', ') + ']';

  hash = sexpr.hash ? ' ' + this.accept(sexpr.hash) : '';

  return this.accept(sexpr.path) + ' ' + params + hash;
};

PrintVisitor.prototype.PathExpression = function (id) {
  var path = id.parts.join('/');
  return (id.data ? '@' : '') + 'PATH:' + path;
};

PrintVisitor.prototype.StringLiteral = function (string) {
  return '"' + string.value + '"';
};

PrintVisitor.prototype.NumberLiteral = function (number) {
  return 'NUMBER{' + number.value + '}';
};

PrintVisitor.prototype.BooleanLiteral = function (bool) {
  return 'BOOLEAN{' + bool.value + '}';
};

PrintVisitor.prototype.UndefinedLiteral = function () {
  return 'UNDEFINED';
};

PrintVisitor.prototype.NullLiteral = function () {
  return 'NULL';
};

PrintVisitor.prototype.Hash = function (hash) {
  var pairs = hash.pairs,
      joinedPairs = [];

  for (var i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.accept(pairs[i]));
  }

  return 'HASH{' + joinedPairs.join(', ') + '}';
};
PrintVisitor.prototype.HashPair = function (pair) {
  return pair.key + '=' + this.accept(pair.value);
};
/* eslint-enable new-cap */


},{"./visitor":27}],27:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

function Visitor() {
  this.parents = [];
}

Visitor.prototype = {
  constructor: Visitor,
  mutating: false,

  // Visits a given value. If mutating, will replace the value if necessary.
  acceptKey: function acceptKey(node, name) {
    var value = this.accept(node[name]);
    if (this.mutating) {
      // Hacky sanity check: This may have a few false positives for type for the helper
      // methods but will generally do the right thing without a lot of overhead.
      if (value && !Visitor.prototype[value.type]) {
        throw new _exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
      }
      node[name] = value;
    }
  },

  // Performs an accept operation with added sanity check to ensure
  // required keys are not removed.
  acceptRequired: function acceptRequired(node, name) {
    this.acceptKey(node, name);

    if (!node[name]) {
      throw new _exception2['default'](node.type + ' requires ' + name);
    }
  },

  // Traverses a given array. If mutating, empty respnses will be removed
  // for child elements.
  acceptArray: function acceptArray(array) {
    for (var i = 0, l = array.length; i < l; i++) {
      this.acceptKey(array, i);

      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  },

  accept: function accept(object) {
    if (!object) {
      return;
    }

    /* istanbul ignore next: Sanity code */
    if (!this[object.type]) {
      throw new _exception2['default']('Unknown type: ' + object.type, object);
    }

    if (this.current) {
      this.parents.unshift(this.current);
    }
    this.current = object;

    var ret = this[object.type](object);

    this.current = this.parents.shift();

    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return object;
    }
  },

  Program: function Program(program) {
    this.acceptArray(program.body);
  },

  MustacheStatement: visitSubExpression,
  Decorator: visitSubExpression,

  BlockStatement: visitBlock,
  DecoratorBlock: visitBlock,

  PartialStatement: visitPartial,
  PartialBlockStatement: function PartialBlockStatement(partial) {
    visitPartial.call(this, partial);

    this.acceptKey(partial, 'program');
  },

  ContentStatement: function ContentStatement() /* content */{},
  CommentStatement: function CommentStatement() /* comment */{},

  SubExpression: visitSubExpression,

  PathExpression: function PathExpression() /* path */{},

  StringLiteral: function StringLiteral() /* string */{},
  NumberLiteral: function NumberLiteral() /* number */{},
  BooleanLiteral: function BooleanLiteral() /* bool */{},
  UndefinedLiteral: function UndefinedLiteral() /* literal */{},
  NullLiteral: function NullLiteral() /* literal */{},

  Hash: function Hash(hash) {
    this.acceptArray(hash.pairs);
  },
  HashPair: function HashPair(pair) {
    this.acceptRequired(pair, 'value');
  }
};

function visitSubExpression(mustache) {
  this.acceptRequired(mustache, 'path');
  this.acceptArray(mustache.params);
  this.acceptKey(mustache, 'hash');
}
function visitBlock(block) {
  visitSubExpression.call(this, block);

  this.acceptKey(block, 'program');
  this.acceptKey(block, 'inverse');
}
function visitPartial(partial) {
  this.acceptRequired(partial, 'name');
  this.acceptArray(partial.params);
  this.acceptKey(partial, 'hash');
}

exports['default'] = Visitor;
module.exports = exports['default'];


},{"../exception":31}],28:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _visitor = require('./visitor');

var _visitor2 = _interopRequireDefault(_visitor);

function WhitespaceControl() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  this.options = options;
}
WhitespaceControl.prototype = new _visitor2['default']();

WhitespaceControl.prototype.Program = function (program) {
  var doStandalone = !this.options.ignoreStandalone;

  var isRoot = !this.isRootSeen;
  this.isRootSeen = true;

  var body = program.body;
  for (var i = 0, l = body.length; i < l; i++) {
    var current = body[i],
        strip = this.accept(current);

    if (!strip) {
      continue;
    }

    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
        _isNextWhitespace = isNextWhitespace(body, i, isRoot),
        openStandalone = strip.openStandalone && _isPrevWhitespace,
        closeStandalone = strip.closeStandalone && _isNextWhitespace,
        inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

    if (strip.close) {
      omitRight(body, i, true);
    }
    if (strip.open) {
      omitLeft(body, i, true);
    }

    if (doStandalone && inlineStandalone) {
      omitRight(body, i);

      if (omitLeft(body, i)) {
        // If we are on a standalone node, save the indent info for partials
        if (current.type === 'PartialStatement') {
          // Pull out the whitespace from the final line
          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
        }
      }
    }
    if (doStandalone && openStandalone) {
      omitRight((current.program || current.inverse).body);

      // Strip out the previous content node if it's whitespace only
      omitLeft(body, i);
    }
    if (doStandalone && closeStandalone) {
      // Always strip the next node
      omitRight(body, i);

      omitLeft((current.inverse || current.program).body);
    }
  }

  return program;
};

WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function (block) {
  this.accept(block.program);
  this.accept(block.inverse);

  // Find the inverse program that is involed with whitespace stripping.
  var program = block.program || block.inverse,
      inverse = block.program && block.inverse,
      firstInverse = inverse,
      lastInverse = inverse;

  if (inverse && inverse.chained) {
    firstInverse = inverse.body[0].program;

    // Walk the inverse chain to find the last inverse that is actually in the chain.
    while (lastInverse.chained) {
      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
    }
  }

  var strip = {
    open: block.openStrip.open,
    close: block.closeStrip.close,

    // Determine the standalone candiacy. Basically flag our content as being possibly standalone
    // so our parent can determine if we actually are standalone
    openStandalone: isNextWhitespace(program.body),
    closeStandalone: isPrevWhitespace((firstInverse || program).body)
  };

  if (block.openStrip.close) {
    omitRight(program.body, null, true);
  }

  if (inverse) {
    var inverseStrip = block.inverseStrip;

    if (inverseStrip.open) {
      omitLeft(program.body, null, true);
    }

    if (inverseStrip.close) {
      omitRight(firstInverse.body, null, true);
    }
    if (block.closeStrip.open) {
      omitLeft(lastInverse.body, null, true);
    }

    // Find standalone else statments
    if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
      omitLeft(program.body);
      omitRight(firstInverse.body);
    }
  } else if (block.closeStrip.open) {
    omitLeft(program.body, null, true);
  }

  return strip;
};

WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function (mustache) {
  return mustache.strip;
};

WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
  /* istanbul ignore next */
  var strip = node.strip || {};
  return {
    inlineStandalone: true,
    open: strip.open,
    close: strip.close
  };
};

function isPrevWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = body.length;
  }

  // Nodes that end with newlines are considered whitespace (but are special
  // cased for strip operations)
  var prev = body[i - 1],
      sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }

  if (prev.type === 'ContentStatement') {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
  }
}
function isNextWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = -1;
  }

  var next = body[i + 1],
      sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }

  if (next.type === 'ContentStatement') {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
  }
}

// Marks the node to the right of the position as omitted.
// I.e. {{foo}}' ' will mark the ' ' node as omitted.
//
// If i is undefined, then the first child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitRight(body, i, multiple) {
  var current = body[i == null ? 0 : i + 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
    return;
  }

  var original = current.value;
  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
  current.rightStripped = current.value !== original;
}

// Marks the node to the left of the position as omitted.
// I.e. ' '{{foo}} will mark the ' ' node as omitted.
//
// If i is undefined then the last child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitLeft(body, i, multiple) {
  var current = body[i == null ? body.length - 1 : i - 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
    return;
  }

  // We omit the last node if it's whitespace only and not preceeded by a non-content node.
  var original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}

exports['default'] = WhitespaceControl;
module.exports = exports['default'];


},{"./visitor":27}],29:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultDecorators = registerDefaultDecorators;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _decoratorsInline = require('./decorators/inline');

var _decoratorsInline2 = _interopRequireDefault(_decoratorsInline);

function registerDefaultDecorators(instance) {
  _decoratorsInline2['default'](instance);
}


},{"./decorators/inline":30}],30:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerDecorator('inline', function (fn, props, container, options) {
    var ret = fn;
    if (!props.partials) {
      props.partials = {};
      ret = function (context, options) {
        // Create a new partials stack frame prior to exec.
        var original = container.partials;
        container.partials = _utils.extend({}, original, props.partials);
        var ret = fn(context, options);
        container.partials = original;
        return ret;
      };
    }

    props.partials[options.args[0]] = options.fn;

    return ret;
  });
};

module.exports = exports['default'];


},{"../utils":44}],31:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      column = undefined;
  if (loc) {
    line = loc.start.line;
    column = loc.start.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  /* istanbul ignore else */
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  if (loc) {
    this.lineNumber = line;
    this.column = column;
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];


},{}],32:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.registerDefaultHelpers = registerDefaultHelpers;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _helpersBlockHelperMissing = require('./helpers/block-helper-missing');

var _helpersBlockHelperMissing2 = _interopRequireDefault(_helpersBlockHelperMissing);

var _helpersEach = require('./helpers/each');

var _helpersEach2 = _interopRequireDefault(_helpersEach);

var _helpersHelperMissing = require('./helpers/helper-missing');

var _helpersHelperMissing2 = _interopRequireDefault(_helpersHelperMissing);

var _helpersIf = require('./helpers/if');

var _helpersIf2 = _interopRequireDefault(_helpersIf);

var _helpersLog = require('./helpers/log');

var _helpersLog2 = _interopRequireDefault(_helpersLog);

var _helpersLookup = require('./helpers/lookup');

var _helpersLookup2 = _interopRequireDefault(_helpersLookup);

var _helpersWith = require('./helpers/with');

var _helpersWith2 = _interopRequireDefault(_helpersWith);

function registerDefaultHelpers(instance) {
  _helpersBlockHelperMissing2['default'](instance);
  _helpersEach2['default'](instance);
  _helpersHelperMissing2['default'](instance);
  _helpersIf2['default'](instance);
  _helpersLog2['default'](instance);
  _helpersLookup2['default'](instance);
  _helpersWith2['default'](instance);
}


},{"./helpers/block-helper-missing":33,"./helpers/each":34,"./helpers/helper-missing":35,"./helpers/if":36,"./helpers/log":37,"./helpers/lookup":38,"./helpers/with":39}],33:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (_utils.isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });
};

module.exports = exports['default'];


},{"../utils":44}],34:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utils = require('../utils');

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = _utils.createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: _utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (_utils.isArray(context)) {
        for (var j = context.length; i < j; i++) {
          if (i in context) {
            execIteration(i, i, i === context.length - 1);
          }
        }
      } else {
        var priorKey = undefined;

        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey !== undefined) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          }
        }
        if (priorKey !== undefined) {
          execIteration(priorKey, i - 1, true);
        }
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });
};

module.exports = exports['default'];


},{"../exception":31,"../utils":44}],35:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _exception = require('../exception');

var _exception2 = _interopRequireDefault(_exception);

exports['default'] = function (instance) {
  instance.registerHelper('helperMissing', function () /* [args, ]options */{
    if (arguments.length === 1) {
      // A missing field in a {{foo}} construct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });
};

module.exports = exports['default'];


},{"../exception":31}],36:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('if', function (conditional, options) {
    if (_utils.isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || _utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
  });
};

module.exports = exports['default'];


},{"../utils":44}],37:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('log', function () /* message, options */{
    var args = [undefined],
        options = arguments[arguments.length - 1];
    for (var i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }

    var level = 1;
    if (options.hash.level != null) {
      level = options.hash.level;
    } else if (options.data && options.data.level != null) {
      level = options.data.level;
    }
    args[0] = level;

    instance.log.apply(instance, args);
  });
};

module.exports = exports['default'];


},{}],38:[function(require,module,exports){
'use strict';

exports.__esModule = true;

exports['default'] = function (instance) {
  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
};

module.exports = exports['default'];


},{}],39:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('../utils');

exports['default'] = function (instance) {
  instance.registerHelper('with', function (context, options) {
    if (_utils.isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!_utils.isEmpty(context)) {
      var data = options.data;
      if (options.data && options.ids) {
        data = _utils.createFrame(options.data);
        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]);
      }

      return fn(context, {
        data: data,
        blockParams: _utils.blockParams([context], [data && data.contextPath])
      });
    } else {
      return options.inverse(this);
    }
  });
};

module.exports = exports['default'];


},{"../utils":44}],40:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _utils = require('./utils');

var logger = {
  methodMap: ['debug', 'info', 'warn', 'error'],
  level: 'info',

  // Maps a given level value to the `methodMap` indexes above.
  lookupLevel: function lookupLevel(level) {
    if (typeof level === 'string') {
      var levelMap = _utils.indexOf(logger.methodMap, level.toLowerCase());
      if (levelMap >= 0) {
        level = levelMap;
      } else {
        level = parseInt(level, 10);
      }
    }

    return level;
  },

  // Can be overridden in the host environment
  log: function log(level) {
    level = logger.lookupLevel(level);

    if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
      var method = logger.methodMap[level];
      if (!console[method]) {
        // eslint-disable-line no-console
        method = 'log';
      }

      for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        message[_key - 1] = arguments[_key];
      }

      console[method].apply(console, message); // eslint-disable-line no-console
    }
  }
};

exports['default'] = logger;
module.exports = exports['default'];


},{"./utils":44}],41:[function(require,module,exports){
(function (global){
/* global window */
'use strict';

exports.__esModule = true;

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
  };
};

module.exports = exports['default'];


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],42:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.checkRevision = checkRevision;
exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;
// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _utils = require('./utils');

var Utils = _interopRequireWildcard(_utils);

var _exception = require('./exception');

var _exception2 = _interopRequireDefault(_exception);

var _base = require('./base');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _base.COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = _base.REVISION_CHANGES[currentRevision],
          compilerVersions = _base.REVISION_CHANGES[compilerRevision];
      throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
    }
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  templateSpec.main.decorator = templateSpec.main_d;

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
      if (options.ids) {
        options.ids[0] = true;
      }
    }

    partial = env.VM.resolvePartial.call(this, partial, context, options);
    var result = env.VM.invokePartial.call(this, partial, context, options);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, options);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name) {
      if (!(name in obj)) {
        throw new _exception2['default']('"' + name + '" not defined in ' + obj);
      }
      return obj[name];
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      var ret = templateSpec[i];
      ret.decorator = templateSpec[i + '_d'];
      return ret;
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    merge: function merge(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      if (options.depths) {
        depths = context !== options.depths[0] ? [context].concat(options.depths) : options.depths;
      } else {
        depths = [context];
      }
    }

    function main(context /*, options*/) {
      return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
    }
    main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
    return main(context, options);
  }
  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
      if (templateSpec.usePartial || templateSpec.useDecorators) {
        container.decorators = container.merge(options.decorators, env.decorators);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
      container.decorators = options.decorators;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    var currentDepths = depths;
    if (depths && context !== depths[0]) {
      currentDepths = [context].concat(depths);
    }

    return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
  }

  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

function resolvePartial(partial, context, options) {
  if (!partial) {
    if (options.name === '@partial-block') {
      partial = options.data['partial-block'];
    } else {
      partial = options.partials[options.name];
    }
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  options.partial = true;
  if (options.ids) {
    options.data.contextPath = options.ids[0] || options.data.contextPath;
  }

  var partialBlock = undefined;
  if (options.fn && options.fn !== noop) {
    options.data = _base.createFrame(options.data);
    partialBlock = options.data['partial-block'] = options.fn;

    if (partialBlock.partials) {
      options.partials = Utils.extend({}, options.partials, partialBlock.partials);
    }
  }

  if (partial === undefined && partialBlock) {
    partial = partialBlock;
  }

  if (partial === undefined) {
    throw new _exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _base.createFrame(data) : {};
    data.root = context;
  }
  return data;
}

function executeDecorators(fn, prog, container, depths, data, blockParams) {
  if (fn.decorator) {
    var props = {};
    prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
    Utils.extend(prog, props);
  }
  return prog;
}


},{"./base":18,"./exception":31,"./utils":44}],43:[function(require,module,exports){
// Build out our basic SafeString type
'use strict';

exports.__esModule = true;
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];


},{}],44:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.createFrame = createFrame;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

var badChars = /[&<>"'`=]/g,
    possible = /[&<>"'`=]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/* eslint-disable func-style */
exports.toString = toString;
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
exports.isFunction = isFunction;

/* eslint-enable func-style */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};

// Older IE versions do not directly support indexOf so we must implement our own, sadly.
exports.isArray = isArray;

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function createFrame(object) {
  var frame = extend({}, object);
  frame._parent = object;
  return frame;
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}


},{}],45:[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');
/* eslint-disable no-var */

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')['default'];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
function extension(module, filename) {
  var fs = require('fs');
  var templateString = fs.readFileSync(filename, 'utf8');
  module.exports = handlebars.compile(templateString);
}
/* istanbul ignore else */
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.handlebars'] = extension;
  require.extensions['.hbs'] = extension;
}

},{"../dist/cjs/handlebars":16,"../dist/cjs/handlebars/compiler/printer":26,"fs":3}],46:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],47:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":46}],48:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],49:[function(require,module,exports){
(function (global){
/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(global) {
  'use strict';

  var testingExposeCycleCount = global.testingExposeCycleCount;

  // Detect and do basic sanity checking on Object/Array.observe.
  function detectObjectObserve() {
    if (typeof Object.observe !== 'function' ||
        typeof Array.observe !== 'function') {
      return false;
    }

    var records = [];

    function callback(recs) {
      records = recs;
    }

    var test = {};
    var arr = [];
    Object.observe(test, callback);
    Array.observe(arr, callback);
    test.id = 1;
    test.id = 2;
    delete test.id;
    arr.push(1, 2);
    arr.length = 0;

    Object.deliverChangeRecords(callback);
    if (records.length !== 5)
      return false;

    if (records[0].type != 'add' ||
        records[1].type != 'update' ||
        records[2].type != 'delete' ||
        records[3].type != 'splice' ||
        records[4].type != 'splice') {
      return false;
    }

    Object.unobserve(test, callback);
    Array.unobserve(arr, callback);

    return true;
  }

  var hasObserve = detectObjectObserve();

  function detectEval() {
    // Don't test for eval if we're running in a Chrome App environment.
    // We check for APIs set that only exist in a Chrome App context.
    if (typeof chrome !== 'undefined' && chrome.app && chrome.app.runtime) {
      return false;
    }

    // Firefox OS Apps do not allow eval. This feature detection is very hacky
    // but even if some other platform adds support for this function this code
    // will continue to work.
    if (typeof navigator != 'undefined' && navigator.getDeviceStorage) {
      return false;
    }

    try {
      var f = new Function('', 'return true;');
      return f();
    } catch (ex) {
      return false;
    }
  }

  var hasEval = detectEval();

  function isIndex(s) {
    return +s === s >>> 0 && s !== '';
  }

  function toNumber(s) {
    return +s;
  }

  function isObject(obj) {
    return obj === Object(obj);
  }

  var numberIsNaN = global.Number.isNaN || function(value) {
    return typeof value === 'number' && global.isNaN(value);
  }

  function areSameValue(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    if (numberIsNaN(left) && numberIsNaN(right))
      return true;

    return left !== left && right !== right;
  }

  var createObject = ('__proto__' in {}) ?
    function(obj) { return obj; } :
    function(obj) {
      var proto = obj.__proto__;
      if (!proto)
        return obj;
      var newObject = Object.create(proto);
      Object.getOwnPropertyNames(obj).forEach(function(name) {
        Object.defineProperty(newObject, name,
                             Object.getOwnPropertyDescriptor(obj, name));
      });
      return newObject;
    };

  var identStart = '[\$_a-zA-Z]';
  var identPart = '[\$_a-zA-Z0-9]';
  var identRegExp = new RegExp('^' + identStart + '+' + identPart + '*' + '$');

  function getPathCharType(char) {
    if (char === undefined)
      return 'eof';

    var code = char.charCodeAt(0);

    switch(code) {
      case 0x5B: // [
      case 0x5D: // ]
      case 0x2E: // .
      case 0x22: // "
      case 0x27: // '
      case 0x30: // 0
        return char;

      case 0x5F: // _
      case 0x24: // $
        return 'ident';

      case 0x20: // Space
      case 0x09: // Tab
      case 0x0A: // Newline
      case 0x0D: // Return
      case 0xA0:  // No-break space
      case 0xFEFF:  // Byte Order Mark
      case 0x2028:  // Line Separator
      case 0x2029:  // Paragraph Separator
        return 'ws';
    }

    // a-z, A-Z
    if ((0x61 <= code && code <= 0x7A) || (0x41 <= code && code <= 0x5A))
      return 'ident';

    // 1-9
    if (0x31 <= code && code <= 0x39)
      return 'number';

    return 'else';
  }

  var pathStateMachine = {
    'beforePath': {
      'ws': ['beforePath'],
      'ident': ['inIdent', 'append'],
      '[': ['beforeElement'],
      'eof': ['afterPath']
    },

    'inPath': {
      'ws': ['inPath'],
      '.': ['beforeIdent'],
      '[': ['beforeElement'],
      'eof': ['afterPath']
    },

    'beforeIdent': {
      'ws': ['beforeIdent'],
      'ident': ['inIdent', 'append']
    },

    'inIdent': {
      'ident': ['inIdent', 'append'],
      '0': ['inIdent', 'append'],
      'number': ['inIdent', 'append'],
      'ws': ['inPath', 'push'],
      '.': ['beforeIdent', 'push'],
      '[': ['beforeElement', 'push'],
      'eof': ['afterPath', 'push']
    },

    'beforeElement': {
      'ws': ['beforeElement'],
      '0': ['afterZero', 'append'],
      'number': ['inIndex', 'append'],
      "'": ['inSingleQuote', 'append', ''],
      '"': ['inDoubleQuote', 'append', '']
    },

    'afterZero': {
      'ws': ['afterElement', 'push'],
      ']': ['inPath', 'push']
    },

    'inIndex': {
      '0': ['inIndex', 'append'],
      'number': ['inIndex', 'append'],
      'ws': ['afterElement'],
      ']': ['inPath', 'push']
    },

    'inSingleQuote': {
      "'": ['afterElement'],
      'eof': ['error'],
      'else': ['inSingleQuote', 'append']
    },

    'inDoubleQuote': {
      '"': ['afterElement'],
      'eof': ['error'],
      'else': ['inDoubleQuote', 'append']
    },

    'afterElement': {
      'ws': ['afterElement'],
      ']': ['inPath', 'push']
    }
  }

  function noop() {}

  function parsePath(path) {
    var keys = [];
    var index = -1;
    var c, newChar, key, type, transition, action, typeMap, mode = 'beforePath';

    var actions = {
      push: function() {
        if (key === undefined)
          return;

        keys.push(key);
        key = undefined;
      },

      append: function() {
        if (key === undefined)
          key = newChar
        else
          key += newChar;
      }
    };

    function maybeUnescapeQuote() {
      if (index >= path.length)
        return;

      var nextChar = path[index + 1];
      if ((mode == 'inSingleQuote' && nextChar == "'") ||
          (mode == 'inDoubleQuote' && nextChar == '"')) {
        index++;
        newChar = nextChar;
        actions.append();
        return true;
      }
    }

    while (mode) {
      index++;
      c = path[index];

      if (c == '\\' && maybeUnescapeQuote(mode))
        continue;

      type = getPathCharType(c);
      typeMap = pathStateMachine[mode];
      transition = typeMap[type] || typeMap['else'] || 'error';

      if (transition == 'error')
        return; // parse error;

      mode = transition[0];
      action = actions[transition[1]] || noop;
      newChar = transition[2] === undefined ? c : transition[2];
      action();

      if (mode === 'afterPath') {
        return keys;
      }
    }

    return; // parse error
  }

  function isIdent(s) {
    return identRegExp.test(s);
  }

  var constructorIsPrivate = {};

  function Path(parts, privateToken) {
    if (privateToken !== constructorIsPrivate)
      throw Error('Use Path.get to retrieve path objects');

    for (var i = 0; i < parts.length; i++) {
      this.push(String(parts[i]));
    }

    if (hasEval && this.length) {
      this.getValueFrom = this.compiledGetValueFromFn();
    }
  }

  // TODO(rafaelw): Make simple LRU cache
  var pathCache = {};

  function getPath(pathString) {
    if (pathString instanceof Path)
      return pathString;

    if (pathString == null || pathString.length == 0)
      pathString = '';

    if (typeof pathString != 'string') {
      if (isIndex(pathString.length)) {
        // Constructed with array-like (pre-parsed) keys
        return new Path(pathString, constructorIsPrivate);
      }

      pathString = String(pathString);
    }

    var path = pathCache[pathString];
    if (path)
      return path;

    var parts = parsePath(pathString);
    if (!parts)
      return invalidPath;

    var path = new Path(parts, constructorIsPrivate);
    pathCache[pathString] = path;
    return path;
  }

  Path.get = getPath;

  function formatAccessor(key) {
    if (isIndex(key)) {
      return '[' + key + ']';
    } else {
      return '["' + key.replace(/"/g, '\\"') + '"]';
    }
  }

  Path.prototype = createObject({
    __proto__: [],
    valid: true,

    toString: function() {
      var pathString = '';
      for (var i = 0; i < this.length; i++) {
        var key = this[i];
        if (isIdent(key)) {
          pathString += i ? '.' + key : key;
        } else {
          pathString += formatAccessor(key);
        }
      }

      return pathString;
    },

    getValueFrom: function(obj, directObserver) {
      for (var i = 0; i < this.length; i++) {
        if (obj == null)
          return;
        obj = obj[this[i]];
      }
      return obj;
    },

    iterateObjects: function(obj, observe) {
      for (var i = 0; i < this.length; i++) {
        if (i)
          obj = obj[this[i - 1]];
        if (!isObject(obj))
          return;
        observe(obj, this[i]);
      }
    },

    compiledGetValueFromFn: function() {
      var str = '';
      var pathString = 'obj';
      str += 'if (obj != null';
      var i = 0;
      var key;
      for (; i < (this.length - 1); i++) {
        key = this[i];
        pathString += isIdent(key) ? '.' + key : formatAccessor(key);
        str += ' &&\n     ' + pathString + ' != null';
      }
      str += ')\n';

      var key = this[i];
      pathString += isIdent(key) ? '.' + key : formatAccessor(key);

      str += '  return ' + pathString + ';\nelse\n  return undefined;';
      return new Function('obj', str);
    },

    setValueFrom: function(obj, value) {
      if (!this.length)
        return false;

      for (var i = 0; i < this.length - 1; i++) {
        if (!isObject(obj))
          return false;
        obj = obj[this[i]];
      }

      if (!isObject(obj))
        return false;

      obj[this[i]] = value;
      return true;
    }
  });

  var invalidPath = new Path('', constructorIsPrivate);
  invalidPath.valid = false;
  invalidPath.getValueFrom = invalidPath.setValueFrom = function() {};

  var MAX_DIRTY_CHECK_CYCLES = 1000;

  function dirtyCheck(observer) {
    var cycles = 0;
    while (cycles < MAX_DIRTY_CHECK_CYCLES && observer.check_()) {
      cycles++;
    }
    if (testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    return cycles > 0;
  }

  function objectIsEmpty(object) {
    for (var prop in object)
      return false;
    return true;
  }

  function diffIsEmpty(diff) {
    return objectIsEmpty(diff.added) &&
           objectIsEmpty(diff.removed) &&
           objectIsEmpty(diff.changed);
  }

  function diffObjectFromOldObject(object, oldObject) {
    var added = {};
    var removed = {};
    var changed = {};

    for (var prop in oldObject) {
      var newValue = object[prop];

      if (newValue !== undefined && newValue === oldObject[prop])
        continue;

      if (!(prop in object)) {
        removed[prop] = undefined;
        continue;
      }

      if (newValue !== oldObject[prop])
        changed[prop] = newValue;
    }

    for (var prop in object) {
      if (prop in oldObject)
        continue;

      added[prop] = object[prop];
    }

    if (Array.isArray(object) && object.length !== oldObject.length)
      changed.length = object.length;

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  var eomTasks = [];
  function runEOMTasks() {
    if (!eomTasks.length)
      return false;

    for (var i = 0; i < eomTasks.length; i++) {
      eomTasks[i]();
    }
    eomTasks.length = 0;
    return true;
  }

  var runEOM = hasObserve ? (function(){
    return function(fn) {
      return Promise.resolve().then(fn);
    }
  })() :
  (function() {
    return function(fn) {
      eomTasks.push(fn);
    };
  })();

  var observedObjectCache = [];

  function newObservedObject() {
    var observer;
    var object;
    var discardRecords = false;
    var first = true;

    function callback(records) {
      if (observer && observer.state_ === OPENED && !discardRecords)
        observer.check_(records);
    }

    return {
      open: function(obs) {
        if (observer)
          throw Error('ObservedObject in use');

        if (!first)
          Object.deliverChangeRecords(callback);

        observer = obs;
        first = false;
      },
      observe: function(obj, arrayObserve) {
        object = obj;
        if (arrayObserve)
          Array.observe(object, callback);
        else
          Object.observe(object, callback);
      },
      deliver: function(discard) {
        discardRecords = discard;
        Object.deliverChangeRecords(callback);
        discardRecords = false;
      },
      close: function() {
        observer = undefined;
        Object.unobserve(object, callback);
        observedObjectCache.push(this);
      }
    };
  }

  /*
   * The observedSet abstraction is a perf optimization which reduces the total
   * number of Object.observe observations of a set of objects. The idea is that
   * groups of Observers will have some object dependencies in common and this
   * observed set ensures that each object in the transitive closure of
   * dependencies is only observed once. The observedSet acts as a write barrier
   * such that whenever any change comes through, all Observers are checked for
   * changed values.
   *
   * Note that this optimization is explicitly moving work from setup-time to
   * change-time.
   *
   * TODO(rafaelw): Implement "garbage collection". In order to move work off
   * the critical path, when Observers are closed, their observed objects are
   * not Object.unobserve(d). As a result, it's possible that if the observedSet
   * is kept open, but some Observers have been closed, it could cause "leaks"
   * (prevent otherwise collectable objects from being collected). At some
   * point, we should implement incremental "gc" which keeps a list of
   * observedSets which may need clean-up and does small amounts of cleanup on a
   * timeout until all is clean.
   */

  function getObservedObject(observer, object, arrayObserve) {
    var dir = observedObjectCache.pop() || newObservedObject();
    dir.open(observer);
    dir.observe(object, arrayObserve);
    return dir;
  }

  var observedSetCache = [];

  function newObservedSet() {
    var observerCount = 0;
    var observers = [];
    var objects = [];
    var rootObj;
    var rootObjProps;

    function observe(obj, prop) {
      if (!obj)
        return;

      if (obj === rootObj)
        rootObjProps[prop] = true;

      if (objects.indexOf(obj) < 0) {
        objects.push(obj);
        Object.observe(obj, callback);
      }

      observe(Object.getPrototypeOf(obj), prop);
    }

    function allRootObjNonObservedProps(recs) {
      for (var i = 0; i < recs.length; i++) {
        var rec = recs[i];
        if (rec.object !== rootObj ||
            rootObjProps[rec.name] ||
            rec.type === 'setPrototype') {
          return false;
        }
      }
      return true;
    }

    function callback(recs) {
      if (allRootObjNonObservedProps(recs))
        return;

      var observer;
      for (var i = 0; i < observers.length; i++) {
        observer = observers[i];
        if (observer.state_ == OPENED) {
          observer.iterateObjects_(observe);
        }
      }

      for (var i = 0; i < observers.length; i++) {
        observer = observers[i];
        if (observer.state_ == OPENED) {
          observer.check_();
        }
      }
    }

    var record = {
      objects: objects,
      get rootObject() { return rootObj; },
      set rootObject(value) {
        rootObj = value;
        rootObjProps = {};
      },
      open: function(obs, object) {
        observers.push(obs);
        observerCount++;
        obs.iterateObjects_(observe);
      },
      close: function(obs) {
        observerCount--;
        if (observerCount > 0) {
          return;
        }

        for (var i = 0; i < objects.length; i++) {
          Object.unobserve(objects[i], callback);
          Observer.unobservedCount++;
        }

        observers.length = 0;
        objects.length = 0;
        rootObj = undefined;
        rootObjProps = undefined;
        observedSetCache.push(this);
        if (lastObservedSet === this)
          lastObservedSet = null;
      },
    };

    return record;
  }

  var lastObservedSet;

  function getObservedSet(observer, obj) {
    if (!lastObservedSet || lastObservedSet.rootObject !== obj) {
      lastObservedSet = observedSetCache.pop() || newObservedSet();
      lastObservedSet.rootObject = obj;
    }
    lastObservedSet.open(observer, obj);
    return lastObservedSet;
  }

  var UNOPENED = 0;
  var OPENED = 1;
  var CLOSED = 2;
  var RESETTING = 3;

  var nextObserverId = 1;

  function Observer() {
    this.state_ = UNOPENED;
    this.callback_ = undefined;
    this.target_ = undefined; // TODO(rafaelw): Should be WeakRef
    this.directObserver_ = undefined;
    this.value_ = undefined;
    this.id_ = nextObserverId++;
  }

  Observer.prototype = {
    open: function(callback, target) {
      if (this.state_ != UNOPENED)
        throw Error('Observer has already been opened.');

      addToAll(this);
      this.callback_ = callback;
      this.target_ = target;
      this.connect_();
      this.state_ = OPENED;
      return this.value_;
    },

    close: function() {
      if (this.state_ != OPENED)
        return;

      removeFromAll(this);
      this.disconnect_();
      this.value_ = undefined;
      this.callback_ = undefined;
      this.target_ = undefined;
      this.state_ = CLOSED;
    },

    deliver: function() {
      if (this.state_ != OPENED)
        return;

      dirtyCheck(this);
    },

    report_: function(changes) {
      try {
        this.callback_.apply(this.target_, changes);
      } catch (ex) {
        Observer._errorThrownDuringCallback = true;
        console.error('Exception caught during observer callback: ' +
                       (ex.stack || ex));
      }
    },

    discardChanges: function() {
      this.check_(undefined, true);
      return this.value_;
    }
  }

  var collectObservers = !hasObserve;
  var allObservers;
  Observer._allObserversCount = 0;

  if (collectObservers) {
    allObservers = [];
  }

  function addToAll(observer) {
    Observer._allObserversCount++;
    if (!collectObservers)
      return;

    allObservers.push(observer);
  }

  function removeFromAll(observer) {
    Observer._allObserversCount--;
  }

  var runningMicrotaskCheckpoint = false;

  global.Platform = global.Platform || {};

  global.Platform.performMicrotaskCheckpoint = function() {
    if (runningMicrotaskCheckpoint)
      return;

    if (!collectObservers)
      return;

    runningMicrotaskCheckpoint = true;

    var cycles = 0;
    var anyChanged, toCheck;

    do {
      cycles++;
      toCheck = allObservers;
      allObservers = [];
      anyChanged = false;

      for (var i = 0; i < toCheck.length; i++) {
        var observer = toCheck[i];
        if (observer.state_ != OPENED)
          continue;

        if (observer.check_())
          anyChanged = true;

        allObservers.push(observer);
      }
      if (runEOMTasks())
        anyChanged = true;
    } while (cycles < MAX_DIRTY_CHECK_CYCLES && anyChanged);

    if (testingExposeCycleCount)
      global.dirtyCheckCycleCount = cycles;

    runningMicrotaskCheckpoint = false;
  };

  if (collectObservers) {
    global.Platform.clearObservers = function() {
      allObservers = [];
    };
  }

  function ObjectObserver(object) {
    Observer.call(this);
    this.value_ = object;
    this.oldObject_ = undefined;
  }

  ObjectObserver.prototype = createObject({
    __proto__: Observer.prototype,

    arrayObserve: false,

    connect_: function(callback, target) {
      if (hasObserve) {
        this.directObserver_ = getObservedObject(this, this.value_,
                                                 this.arrayObserve);
      } else {
        this.oldObject_ = this.copyObject(this.value_);
      }

    },

    copyObject: function(object) {
      var copy = Array.isArray(object) ? [] : {};
      for (var prop in object) {
        copy[prop] = object[prop];
      };
      if (Array.isArray(object))
        copy.length = object.length;
      return copy;
    },

    check_: function(changeRecords, skipChanges) {
      var diff;
      var oldValues;
      if (hasObserve) {
        if (!changeRecords)
          return false;

        oldValues = {};
        diff = diffObjectFromChangeRecords(this.value_, changeRecords,
                                           oldValues);
      } else {
        oldValues = this.oldObject_;
        diff = diffObjectFromOldObject(this.value_, this.oldObject_);
      }

      if (diffIsEmpty(diff))
        return false;

      if (!hasObserve)
        this.oldObject_ = this.copyObject(this.value_);

      this.report_([
        diff.added || {},
        diff.removed || {},
        diff.changed || {},
        function(property) {
          return oldValues[property];
        }
      ]);

      return true;
    },

    disconnect_: function() {
      if (hasObserve) {
        this.directObserver_.close();
        this.directObserver_ = undefined;
      } else {
        this.oldObject_ = undefined;
      }
    },

    deliver: function() {
      if (this.state_ != OPENED)
        return;

      if (hasObserve)
        this.directObserver_.deliver(false);
      else
        dirtyCheck(this);
    },

    discardChanges: function() {
      if (this.directObserver_)
        this.directObserver_.deliver(true);
      else
        this.oldObject_ = this.copyObject(this.value_);

      return this.value_;
    }
  });

  function ArrayObserver(array) {
    if (!Array.isArray(array))
      throw Error('Provided object is not an Array');
    ObjectObserver.call(this, array);
  }

  ArrayObserver.prototype = createObject({

    __proto__: ObjectObserver.prototype,

    arrayObserve: true,

    copyObject: function(arr) {
      return arr.slice();
    },

    check_: function(changeRecords) {
      var splices;
      if (hasObserve) {
        if (!changeRecords)
          return false;
        splices = projectArraySplices(this.value_, changeRecords);
      } else {
        splices = calcSplices(this.value_, 0, this.value_.length,
                              this.oldObject_, 0, this.oldObject_.length);
      }

      if (!splices || !splices.length)
        return false;

      if (!hasObserve)
        this.oldObject_ = this.copyObject(this.value_);

      this.report_([splices]);
      return true;
    }
  });

  ArrayObserver.applySplices = function(previous, current, splices) {
    splices.forEach(function(splice) {
      var spliceArgs = [splice.index, splice.removed.length];
      var addIndex = splice.index;
      while (addIndex < splice.index + splice.addedCount) {
        spliceArgs.push(current[addIndex]);
        addIndex++;
      }

      Array.prototype.splice.apply(previous, spliceArgs);
    });
  };

  function PathObserver(object, path) {
    Observer.call(this);

    this.object_ = object;
    this.path_ = getPath(path);
    this.directObserver_ = undefined;
  }

  PathObserver.prototype = createObject({
    __proto__: Observer.prototype,

    get path() {
      return this.path_;
    },

    connect_: function() {
      if (hasObserve)
        this.directObserver_ = getObservedSet(this, this.object_);

      this.check_(undefined, true);
    },

    disconnect_: function() {
      this.value_ = undefined;

      if (this.directObserver_) {
        this.directObserver_.close(this);
        this.directObserver_ = undefined;
      }
    },

    iterateObjects_: function(observe) {
      this.path_.iterateObjects(this.object_, observe);
    },

    check_: function(changeRecords, skipChanges) {
      var oldValue = this.value_;
      this.value_ = this.path_.getValueFrom(this.object_);
      if (skipChanges || areSameValue(this.value_, oldValue))
        return false;

      this.report_([this.value_, oldValue, this]);
      return true;
    },

    setValue: function(newValue) {
      if (this.path_)
        this.path_.setValueFrom(this.object_, newValue);
    }
  });

  function CompoundObserver(reportChangesOnOpen) {
    Observer.call(this);

    this.reportChangesOnOpen_ = reportChangesOnOpen;
    this.value_ = [];
    this.directObserver_ = undefined;
    this.observed_ = [];
  }

  var observerSentinel = {};

  CompoundObserver.prototype = createObject({
    __proto__: Observer.prototype,

    connect_: function() {
      if (hasObserve) {
        var object;
        var needsDirectObserver = false;
        for (var i = 0; i < this.observed_.length; i += 2) {
          object = this.observed_[i]
          if (object !== observerSentinel) {
            needsDirectObserver = true;
            break;
          }
        }

        if (needsDirectObserver)
          this.directObserver_ = getObservedSet(this, object);
      }

      this.check_(undefined, !this.reportChangesOnOpen_);
    },

    disconnect_: function() {
      for (var i = 0; i < this.observed_.length; i += 2) {
        if (this.observed_[i] === observerSentinel)
          this.observed_[i + 1].close();
      }
      this.observed_.length = 0;
      this.value_.length = 0;

      if (this.directObserver_) {
        this.directObserver_.close(this);
        this.directObserver_ = undefined;
      }
    },

    addPath: function(object, path) {
      if (this.state_ != UNOPENED && this.state_ != RESETTING)
        throw Error('Cannot add paths once started.');

      var path = getPath(path);
      this.observed_.push(object, path);
      if (!this.reportChangesOnOpen_)
        return;
      var index = this.observed_.length / 2 - 1;
      this.value_[index] = path.getValueFrom(object);
    },

    addObserver: function(observer) {
      if (this.state_ != UNOPENED && this.state_ != RESETTING)
        throw Error('Cannot add observers once started.');

      this.observed_.push(observerSentinel, observer);
      if (!this.reportChangesOnOpen_)
        return;
      var index = this.observed_.length / 2 - 1;
      this.value_[index] = observer.open(this.deliver, this);
    },

    startReset: function() {
      if (this.state_ != OPENED)
        throw Error('Can only reset while open');

      this.state_ = RESETTING;
      this.disconnect_();
    },

    finishReset: function() {
      if (this.state_ != RESETTING)
        throw Error('Can only finishReset after startReset');
      this.state_ = OPENED;
      this.connect_();

      return this.value_;
    },

    iterateObjects_: function(observe) {
      var object;
      for (var i = 0; i < this.observed_.length; i += 2) {
        object = this.observed_[i]
        if (object !== observerSentinel)
          this.observed_[i + 1].iterateObjects(object, observe)
      }
    },

    check_: function(changeRecords, skipChanges) {
      var oldValues;
      for (var i = 0; i < this.observed_.length; i += 2) {
        var object = this.observed_[i];
        var path = this.observed_[i+1];
        var value;
        if (object === observerSentinel) {
          var observable = path;
          value = this.state_ === UNOPENED ?
              observable.open(this.deliver, this) :
              observable.discardChanges();
        } else {
          value = path.getValueFrom(object);
        }

        if (skipChanges) {
          this.value_[i / 2] = value;
          continue;
        }

        if (areSameValue(value, this.value_[i / 2]))
          continue;

        oldValues = oldValues || [];
        oldValues[i / 2] = this.value_[i / 2];
        this.value_[i / 2] = value;
      }

      if (!oldValues)
        return false;

      // TODO(rafaelw): Having observed_ as the third callback arg here is
      // pretty lame API. Fix.
      this.report_([this.value_, oldValues, this.observed_]);
      return true;
    }
  });

  function identFn(value) { return value; }

  function ObserverTransform(observable, getValueFn, setValueFn,
                             dontPassThroughSet) {
    this.callback_ = undefined;
    this.target_ = undefined;
    this.value_ = undefined;
    this.observable_ = observable;
    this.getValueFn_ = getValueFn || identFn;
    this.setValueFn_ = setValueFn || identFn;
    // TODO(rafaelw): This is a temporary hack. PolymerExpressions needs this
    // at the moment because of a bug in it's dependency tracking.
    this.dontPassThroughSet_ = dontPassThroughSet;
  }

  ObserverTransform.prototype = {
    open: function(callback, target) {
      this.callback_ = callback;
      this.target_ = target;
      this.value_ =
          this.getValueFn_(this.observable_.open(this.observedCallback_, this));
      return this.value_;
    },

    observedCallback_: function(value) {
      value = this.getValueFn_(value);
      if (areSameValue(value, this.value_))
        return;
      var oldValue = this.value_;
      this.value_ = value;
      this.callback_.call(this.target_, this.value_, oldValue);
    },

    discardChanges: function() {
      this.value_ = this.getValueFn_(this.observable_.discardChanges());
      return this.value_;
    },

    deliver: function() {
      return this.observable_.deliver();
    },

    setValue: function(value) {
      value = this.setValueFn_(value);
      if (!this.dontPassThroughSet_ && this.observable_.setValue)
        return this.observable_.setValue(value);
    },

    close: function() {
      if (this.observable_)
        this.observable_.close();
      this.callback_ = undefined;
      this.target_ = undefined;
      this.observable_ = undefined;
      this.value_ = undefined;
      this.getValueFn_ = undefined;
      this.setValueFn_ = undefined;
    }
  }

  var expectedRecordTypes = {
    add: true,
    update: true,
    delete: true
  };

  function diffObjectFromChangeRecords(object, changeRecords, oldValues) {
    var added = {};
    var removed = {};

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      if (!expectedRecordTypes[record.type]) {
        console.error('Unknown changeRecord type: ' + record.type);
        console.error(record);
        continue;
      }

      if (!(record.name in oldValues))
        oldValues[record.name] = record.oldValue;

      if (record.type == 'update')
        continue;

      if (record.type == 'add') {
        if (record.name in removed)
          delete removed[record.name];
        else
          added[record.name] = true;

        continue;
      }

      // type = 'delete'
      if (record.name in added) {
        delete added[record.name];
        delete oldValues[record.name];
      } else {
        removed[record.name] = true;
      }
    }

    for (var prop in added)
      added[prop] = object[prop];

    for (var prop in removed)
      removed[prop] = undefined;

    var changed = {};
    for (var prop in oldValues) {
      if (prop in added || prop in removed)
        continue;

      var newValue = object[prop];
      if (oldValues[prop] !== newValue)
        changed[prop] = newValue;
    }

    return {
      added: added,
      removed: removed,
      changed: changed
    };
  }

  function newSplice(index, removed, addedCount) {
    return {
      index: index,
      removed: removed,
      addedCount: addedCount
    };
  }

  var EDIT_LEAVE = 0;
  var EDIT_UPDATE = 1;
  var EDIT_ADD = 2;
  var EDIT_DELETE = 3;

  function ArraySplice() {}

  ArraySplice.prototype = {

    // Note: This function is *based* on the computation of the Levenshtein
    // "edit" distance. The one change is that "updates" are treated as two
    // edits - not one. With Array splices, an update is really a delete
    // followed by an add. By retaining this, we optimize for "keeping" the
    // maximum array items in the original array. For example:
    //
    //   'xxxx123' -> '123yyyy'
    //
    // With 1-edit updates, the shortest path would be just to update all seven
    // characters. With 2-edit updates, we delete 4, leave 3, and add 4. This
    // leaves the substring '123' intact.
    calcEditDistances: function(current, currentStart, currentEnd,
                                old, oldStart, oldEnd) {
      // "Deletion" columns
      var rowCount = oldEnd - oldStart + 1;
      var columnCount = currentEnd - currentStart + 1;
      var distances = new Array(rowCount);

      // "Addition" rows. Initialize null column.
      for (var i = 0; i < rowCount; i++) {
        distances[i] = new Array(columnCount);
        distances[i][0] = i;
      }

      // Initialize null row
      for (var j = 0; j < columnCount; j++)
        distances[0][j] = j;

      for (var i = 1; i < rowCount; i++) {
        for (var j = 1; j < columnCount; j++) {
          if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
            distances[i][j] = distances[i - 1][j - 1];
          else {
            var north = distances[i - 1][j] + 1;
            var west = distances[i][j - 1] + 1;
            distances[i][j] = north < west ? north : west;
          }
        }
      }

      return distances;
    },

    // This starts at the final weight, and walks "backward" by finding
    // the minimum previous weight recursively until the origin of the weight
    // matrix.
    spliceOperationsFromEditDistances: function(distances) {
      var i = distances.length - 1;
      var j = distances[0].length - 1;
      var current = distances[i][j];
      var edits = [];
      while (i > 0 || j > 0) {
        if (i == 0) {
          edits.push(EDIT_ADD);
          j--;
          continue;
        }
        if (j == 0) {
          edits.push(EDIT_DELETE);
          i--;
          continue;
        }
        var northWest = distances[i - 1][j - 1];
        var west = distances[i - 1][j];
        var north = distances[i][j - 1];

        var min;
        if (west < north)
          min = west < northWest ? west : northWest;
        else
          min = north < northWest ? north : northWest;

        if (min == northWest) {
          if (northWest == current) {
            edits.push(EDIT_LEAVE);
          } else {
            edits.push(EDIT_UPDATE);
            current = northWest;
          }
          i--;
          j--;
        } else if (min == west) {
          edits.push(EDIT_DELETE);
          i--;
          current = west;
        } else {
          edits.push(EDIT_ADD);
          j--;
          current = north;
        }
      }

      edits.reverse();
      return edits;
    },

    /**
     * Splice Projection functions:
     *
     * A splice map is a representation of how a previous array of items
     * was transformed into a new array of items. Conceptually it is a list of
     * tuples of
     *
     *   <index, removed, addedCount>
     *
     * which are kept in ascending index order of. The tuple represents that at
     * the |index|, |removed| sequence of items were removed, and counting forward
     * from |index|, |addedCount| items were added.
     */

    /**
     * Lacking individual splice mutation information, the minimal set of
     * splices can be synthesized given the previous state and final state of an
     * array. The basic approach is to calculate the edit distance matrix and
     * choose the shortest path through it.
     *
     * Complexity: O(l * p)
     *   l: The length of the current array
     *   p: The length of the old array
     */
    calcSplices: function(current, currentStart, currentEnd,
                          old, oldStart, oldEnd) {
      var prefixCount = 0;
      var suffixCount = 0;

      var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
      if (currentStart == 0 && oldStart == 0)
        prefixCount = this.sharedPrefix(current, old, minLength);

      if (currentEnd == current.length && oldEnd == old.length)
        suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);

      currentStart += prefixCount;
      oldStart += prefixCount;
      currentEnd -= suffixCount;
      oldEnd -= suffixCount;

      if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
        return [];

      if (currentStart == currentEnd) {
        var splice = newSplice(currentStart, [], 0);
        while (oldStart < oldEnd)
          splice.removed.push(old[oldStart++]);

        return [ splice ];
      } else if (oldStart == oldEnd)
        return [ newSplice(currentStart, [], currentEnd - currentStart) ];

      var ops = this.spliceOperationsFromEditDistances(
          this.calcEditDistances(current, currentStart, currentEnd,
                                 old, oldStart, oldEnd));

      var splice = undefined;
      var splices = [];
      var index = currentStart;
      var oldIndex = oldStart;
      for (var i = 0; i < ops.length; i++) {
        switch(ops[i]) {
          case EDIT_LEAVE:
            if (splice) {
              splices.push(splice);
              splice = undefined;
            }

            index++;
            oldIndex++;
            break;
          case EDIT_UPDATE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
          case EDIT_ADD:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.addedCount++;
            index++;
            break;
          case EDIT_DELETE:
            if (!splice)
              splice = newSplice(index, [], 0);

            splice.removed.push(old[oldIndex]);
            oldIndex++;
            break;
        }
      }

      if (splice) {
        splices.push(splice);
      }
      return splices;
    },

    sharedPrefix: function(current, old, searchLength) {
      for (var i = 0; i < searchLength; i++)
        if (!this.equals(current[i], old[i]))
          return i;
      return searchLength;
    },

    sharedSuffix: function(current, old, searchLength) {
      var index1 = current.length;
      var index2 = old.length;
      var count = 0;
      while (count < searchLength && this.equals(current[--index1], old[--index2]))
        count++;

      return count;
    },

    calculateSplices: function(current, previous) {
      return this.calcSplices(current, 0, current.length, previous, 0,
                              previous.length);
    },

    equals: function(currentValue, previousValue) {
      return currentValue === previousValue;
    }
  };

  var arraySplice = new ArraySplice();

  function calcSplices(current, currentStart, currentEnd,
                       old, oldStart, oldEnd) {
    return arraySplice.calcSplices(current, currentStart, currentEnd,
                                   old, oldStart, oldEnd);
  }

  function intersect(start1, end1, start2, end2) {
    // Disjoint
    if (end1 < start2 || end2 < start1)
      return -1;

    // Adjacent
    if (end1 == start2 || end2 == start1)
      return 0;

    // Non-zero intersect, span1 first
    if (start1 < start2) {
      if (end1 < end2)
        return end1 - start2; // Overlap
      else
        return end2 - start2; // Contained
    } else {
      // Non-zero intersect, span2 first
      if (end2 < end1)
        return end2 - start1; // Overlap
      else
        return end1 - start1; // Contained
    }
  }

  function mergeSplice(splices, index, removed, addedCount) {

    var splice = newSplice(index, removed, addedCount);

    var inserted = false;
    var insertionOffset = 0;

    for (var i = 0; i < splices.length; i++) {
      var current = splices[i];
      current.index += insertionOffset;

      if (inserted)
        continue;

      var intersectCount = intersect(splice.index,
                                     splice.index + splice.removed.length,
                                     current.index,
                                     current.index + current.addedCount);

      if (intersectCount >= 0) {
        // Merge the two splices

        splices.splice(i, 1);
        i--;

        insertionOffset -= current.addedCount - current.removed.length;

        splice.addedCount += current.addedCount - intersectCount;
        var deleteCount = splice.removed.length +
                          current.removed.length - intersectCount;

        if (!splice.addedCount && !deleteCount) {
          // merged splice is a noop. discard.
          inserted = true;
        } else {
          var removed = current.removed;

          if (splice.index < current.index) {
            // some prefix of splice.removed is prepended to current.removed.
            var prepend = splice.removed.slice(0, current.index - splice.index);
            Array.prototype.push.apply(prepend, removed);
            removed = prepend;
          }

          if (splice.index + splice.removed.length > current.index + current.addedCount) {
            // some suffix of splice.removed is appended to current.removed.
            var append = splice.removed.slice(current.index + current.addedCount - splice.index);
            Array.prototype.push.apply(removed, append);
          }

          splice.removed = removed;
          if (current.index < splice.index) {
            splice.index = current.index;
          }
        }
      } else if (splice.index < current.index) {
        // Insert splice here.

        inserted = true;

        splices.splice(i, 0, splice);
        i++;

        var offset = splice.addedCount - splice.removed.length
        current.index += offset;
        insertionOffset += offset;
      }
    }

    if (!inserted)
      splices.push(splice);
  }

  function createInitialSplices(array, changeRecords) {
    var splices = [];

    for (var i = 0; i < changeRecords.length; i++) {
      var record = changeRecords[i];
      switch(record.type) {
        case 'splice':
          mergeSplice(splices, record.index, record.removed.slice(), record.addedCount);
          break;
        case 'add':
        case 'update':
        case 'delete':
          if (!isIndex(record.name))
            continue;
          var index = toNumber(record.name);
          if (index < 0)
            continue;
          mergeSplice(splices, index, [record.oldValue], 1);
          break;
        default:
          console.error('Unexpected record type: ' + JSON.stringify(record));
          break;
      }
    }

    return splices;
  }

  function projectArraySplices(array, changeRecords) {
    var splices = [];

    createInitialSplices(array, changeRecords).forEach(function(splice) {
      if (splice.addedCount == 1 && splice.removed.length == 1) {
        if (splice.removed[0] !== array[splice.index])
          splices.push(splice);

        return
      };

      splices = splices.concat(calcSplices(array, splice.index, splice.index + splice.addedCount,
                                           splice.removed, 0, splice.removed.length));
    });

    return splices;
  }

  // Export the observe-js object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, export as a global object.

  var expose = global;

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      expose = exports = module.exports;
    }
    expose = exports;
  } 

  expose.Observer = Observer;
  expose.Observer.runEOM_ = runEOM;
  expose.Observer.observerSentinel_ = observerSentinel; // for testing.
  expose.Observer.hasObjectObserve = hasObserve;
  expose.ArrayObserver = ArrayObserver;
  expose.ArrayObserver.calculateSplices = function(current, previous) {
    return arraySplice.calculateSplices(current, previous);
  };

  expose.ArraySplice = ArraySplice;
  expose.ObjectObserver = ObjectObserver;
  expose.PathObserver = PathObserver;
  expose.CompoundObserver = CompoundObserver;
  expose.Path = Path;
  expose.ObserverTransform = ObserverTransform;
  
})(typeof global !== 'undefined' && global && typeof module !== 'undefined' && module ? global : this || window);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],50:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./source-map/source-node').SourceNode;

},{"./source-map/source-map-consumer":57,"./source-map/source-map-generator":58,"./source-map/source-node":59}],51:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  function ArraySet() {
    this._array = [];
    this._set = {};
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Return how many unique items are in this ArraySet. If duplicates have been
   * added, than those do not count towards the size.
   *
   * @returns Number
   */
  ArraySet.prototype.size = function ArraySet_size() {
    return Object.getOwnPropertyNames(this._set).length;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set[util.toSetString(aStr)] = idx;
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    return Object.prototype.hasOwnProperty.call(this._set,
                                                util.toSetString(aStr));
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (this.has(aStr)) {
      return this._set[util.toSetString(aStr)];
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error('No element indexed by ' + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };

  exports.ArraySet = ArraySet;

});

},{"./util":60,"amdefine":9}],52:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64 = require('./base64');

  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Converts to a two-complement value from a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
   *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
   */
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative
      ? -shifted
      : shifted;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  /**
   * Decodes the next base 64 VLQ value from the given string and returns the
   * value and the rest of the string via the out parameter.
   */
  exports.decode = function base64VLQ_decode(aStr, aIndex, aOutParam) {
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;

    do {
      if (aIndex >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }

      digit = base64.decode(aStr.charCodeAt(aIndex++));
      if (digit === -1) {
        throw new Error("Invalid base64 digit: " + aStr.charAt(aIndex - 1));
      }

      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    aOutParam.value = fromVLQSigned(result);
    aOutParam.rest = aIndex;
  };

});

},{"./base64":53,"amdefine":9}],53:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var intToCharMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  exports.encode = function (number) {
    if (0 <= number && number < intToCharMap.length) {
      return intToCharMap[number];
    }
    throw new TypeError("Must be between 0 and 63: " + aNumber);
  };

  /**
   * Decode a single base 64 character code digit to an integer. Returns -1 on
   * failure.
   */
  exports.decode = function (charCode) {
    var bigA = 65;     // 'A'
    var bigZ = 90;     // 'Z'

    var littleA = 97;  // 'a'
    var littleZ = 122; // 'z'

    var zero = 48;     // '0'
    var nine = 57;     // '9'

    var plus = 43;     // '+'
    var slash = 47;    // '/'

    var littleOffset = 26;
    var numberOffset = 52;

    // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
    if (bigA <= charCode && charCode <= bigZ) {
      return (charCode - bigA);
    }

    // 26 - 51: abcdefghijklmnopqrstuvwxyz
    if (littleA <= charCode && charCode <= littleZ) {
      return (charCode - littleA + littleOffset);
    }

    // 52 - 61: 0123456789
    if (zero <= charCode && charCode <= nine) {
      return (charCode - zero + numberOffset);
    }

    // 62: +
    if (charCode == plus) {
      return 62;
    }

    // 63: /
    if (charCode == slash) {
      return 63;
    }

    // Invalid base64 digit.
    return -1;
  };

});

},{"amdefine":9}],54:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  exports.GREATEST_LOWER_BOUND = 1;
  exports.LEAST_UPPER_BOUND = 2;

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the index of
    //      the next-closest element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element than the one we are searching for, so we return -1.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return mid;
    }
    else if (cmp > 0) {
      // Our needle is greater than aHaystack[mid].
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
      }

      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (3) or (2) and return the appropriate thing.
      if (aBias == exports.LEAST_UPPER_BOUND) {
        return aHigh < aHaystack.length ? aHigh : -1;
      } else {
        return mid;
      }
    }
    else {
      // Our needle is less than aHaystack[mid].
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
      }

      // we are in termination case (3) or (2) and return the appropriate thing.
      if (aBias == exports.LEAST_UPPER_BOUND) {
        return mid;
      } else {
        return aLow < 0 ? -1 : aLow;
      }
    }
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the index of the closest element if there is no exact hit. This is because
   * mappings between original and generated line/col pairs are single points,
   * and there is an implicit region between each of them, so a miss just means
   * that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
    if (aHaystack.length === 0) {
      return -1;
    }

    var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                                aCompare, aBias || exports.GREATEST_LOWER_BOUND);
    if (index < 0) {
      return -1;
    }

    // We have found either the exact element, or the next-closest element than
    // the one we are searching for. However, there may be more than one such
    // element. Make sure we always return the smallest of these.
    while (index - 1 >= 0) {
      if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
        break;
      }
      --index;
    }

    return index;
  };

});

},{"amdefine":9}],55:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * Determine whether mappingB is after mappingA with respect to generated
   * position.
   */
  function generatedPositionAfter(mappingA, mappingB) {
    // Optimized for most common case
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA ||
           util.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
  }

  /**
   * A data structure to provide a sorted view of accumulated mappings in a
   * performance conscious manner. It trades a neglibable overhead in general
   * case for a large speedup in case of mappings being added in order.
   */
  function MappingList() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {generatedLine: -1, generatedColumn: 0};
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  MappingList.prototype.unsortedForEach =
    function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  MappingList.prototype.add = function MappingList_add(aMapping) {
    var mapping;
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  MappingList.prototype.toArray = function MappingList_toArray() {
    if (!this._sorted) {
      this._array.sort(util.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  };

  exports.MappingList = MappingList;

});

},{"./util":60,"amdefine":9}],56:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  // It turns out that some (most?) JavaScript engines don't self-host
  // `Array.prototype.sort`. This makes sense because C++ will likely remain
  // faster than JS when doing raw CPU-intensive sorting. However, when using a
  // custom comparator function, calling back and forth between the VM's C++ and
  // JIT'd JS is rather slow *and* loses JIT type information, resulting in
  // worse generated code for the comparator function than would be optimal. In
  // fact, when sorting with a comparator, these costs outweigh the benefits of
  // sorting in C++. By using our own JS-implemented Quick Sort (below), we get
  // a ~3500ms mean speed-up in `bench/bench.html`.

  /**
   * Swap the elements indexed by `x` and `y` in the array `ary`.
   *
   * @param {Array} ary
   *        The array.
   * @param {Number} x
   *        The index of the first item.
   * @param {Number} y
   *        The index of the second item.
   */
  function swap(ary, x, y) {
    var temp = ary[x];
    ary[x] = ary[y];
    ary[y] = temp;
  }

  /**
   * Returns a random integer within the range `low .. high` inclusive.
   *
   * @param {Number} low
   *        The lower bound on the range.
   * @param {Number} high
   *        The upper bound on the range.
   */
  function randomIntInRange(low, high) {
    return Math.round(low + (Math.random() * (high - low)));
  }

  /**
   * The Quick Sort algorithm.
   *
   * @param {Array} ary
   *        An array to sort.
   * @param {function} comparator
   *        Function to use to compare two items.
   * @param {Number} p
   *        Start index of the array
   * @param {Number} r
   *        End index of the array
   */
  function doQuickSort(ary, comparator, p, r) {
    // If our lower bound is less than our upper bound, we (1) partition the
    // array into two pieces and (2) recurse on each half. If it is not, this is
    // the empty array and our base case.

    if (p < r) {
      // (1) Partitioning.
      //
      // The partitioning chooses a pivot between `p` and `r` and moves all
      // elements that are less than or equal to the pivot to the before it, and
      // all the elements that are greater than it after it. The effect is that
      // once partition is done, the pivot is in the exact place it will be when
      // the array is put in sorted order, and it will not need to be moved
      // again. This runs in O(n) time.

      // Always choose a random pivot so that an input array which is reverse
      // sorted does not cause O(n^2) running time.
      var pivotIndex = randomIntInRange(p, r);
      var i = p - 1;

      swap(ary, pivotIndex, r);
      var pivot = ary[r];

      // Immediately after `j` is incremented in this loop, the following hold
      // true:
      //
      //   * Every element in `ary[p .. i]` is less than or equal to the pivot.
      //
      //   * Every element in `ary[i+1 .. j-1]` is greater than the pivot.
      for (var j = p; j < r; j++) {
        if (comparator(ary[j], pivot) <= 0) {
          i += 1;
          swap(ary, i, j);
        }
      }

      swap(ary, i + 1, j);
      var q = i + 1;

      // (2) Recurse on each half.

      doQuickSort(ary, comparator, p, q - 1);
      doQuickSort(ary, comparator, q + 1, r);
    }
  }

  /**
   * Sort the given array in-place with the given comparator function.
   *
   * @param {Array} ary
   *        An array to sort.
   * @param {function} comparator
   *        Function to use to compare two items.
   */
  exports.quickSort = function (ary, comparator) {
    doQuickSort(ary, comparator, 0, ary.length - 1);
  };

});

},{"amdefine":9}],57:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');
  var binarySearch = require('./binary-search');
  var ArraySet = require('./array-set').ArraySet;
  var base64VLQ = require('./base64-vlq');
  var quickSort = require('./quick-sort').quickSort;

  function SourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    return sourceMap.sections != null
      ? new IndexedSourceMapConsumer(sourceMap)
      : new BasicSourceMapConsumer(sourceMap);
  }

  SourceMapConsumer.fromSourceMap = function(aSourceMap) {
    return BasicSourceMapConsumer.fromSourceMap(aSourceMap);
  }

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
    get: function () {
      if (!this.__generatedMappings) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappings;
    }
  });

  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
    get: function () {
      if (!this.__originalMappings) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappings;
    }
  });

  SourceMapConsumer.prototype._charIsMappingSeparator =
    function SourceMapConsumer_charIsMappingSeparator(aStr, index) {
      var c = aStr.charAt(index);
      return c === ";" || c === ",";
    };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      throw new Error("Subclasses must implement _parseMappings");
    };

  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
  SourceMapConsumer.LEAST_UPPER_BOUND = 2;

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping =
    function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function (mapping) {
        var source = mapping.source === null ? null : this._sources.at(mapping.source);
        if (source != null && sourceRoot != null) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name === null ? null : this._names.at(mapping.name)
        };
      }, this).forEach(aCallback, context);
    };

  /**
   * Returns all generated line and column information for the original source,
   * line, and column provided. If no column is provided, returns all mappings
   * corresponding to a either the line we are searching for or the next
   * closest line that has any mappings. Otherwise, returns all mappings
   * corresponding to the given line and either the column we are searching for
   * or the next closest column that has any offsets.
   *
   * The only argument is an object with the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: Optional. the column number in the original source.
   *
   * and an array of objects is returned, each with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.allGeneratedPositionsFor =
    function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      var line = util.getArg(aArgs, 'line');

      // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
      // returns the index of the closest mapping less than the needle. By
      // setting needle.originalColumn to 0, we thus find the last mapping for
      // the given line, provided such a mapping exists.
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: line,
        originalColumn: util.getArg(aArgs, 'column', 0)
      };

      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }
      if (!this._sources.has(needle.source)) {
        return [];
      }
      needle.source = this._sources.indexOf(needle.source);

      var mappings = [];

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util.compareByOriginalPositions,
                                    binarySearch.LEAST_UPPER_BOUND);
      if (index >= 0) {
        var mapping = this._originalMappings[index];

        if (aArgs.column === undefined) {
          var originalLine = mapping.originalLine;

          // Iterate until either we run out of mappings, or we run into
          // a mapping for a different line than the one we found. Since
          // mappings are sorted, this is guaranteed to find all mappings for
          // the line we found.
          while (mapping && mapping.originalLine === originalLine) {
            mappings.push({
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            });

            mapping = this._originalMappings[++index];
          }
        } else {
          var originalColumn = mapping.originalColumn;

          // Iterate until either we run out of mappings, or we run into
          // a mapping for a different line than the one we were searching for.
          // Since mappings are sorted, this is guaranteed to find all mappings for
          // the line we are searching for.
          while (mapping &&
                 mapping.originalLine === line &&
                 mapping.originalColumn == originalColumn) {
            mappings.push({
              line: util.getArg(mapping, 'generatedLine', null),
              column: util.getArg(mapping, 'generatedColumn', null),
              lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
            });

            mapping = this._originalMappings[++index];
          }
        }
      }

      return mappings;
    };

  exports.SourceMapConsumer = SourceMapConsumer;

  /**
   * A BasicSourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The only parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referrenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  function BasicSourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sources = util.getArg(sourceMap, 'sources');
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    var names = util.getArg(sourceMap, 'names', []);
    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
    var mappings = util.getArg(sourceMap, 'mappings');
    var file = util.getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    sources = sources.map(util.normalize);

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names, true);
    this._sources = ArraySet.fromArray(sources, true);

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this.file = file;
  }

  BasicSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
  BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;

  /**
   * Create a BasicSourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @returns BasicSourceMapConsumer
   */
  BasicSourceMapConsumer.fromSourceMap =
    function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(BasicSourceMapConsumer.prototype);

      var names = smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      var sources = smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                              smc.sourceRoot);
      smc.file = aSourceMap._file;

      // Because we are modifying the entries (by converting string sources and
      // names to indices into the sources and names ArraySets), we have to make
      // a copy of the entry or else bad things happen. Shared mutable state
      // strikes again! See github issue #191.

      var generatedMappings = aSourceMap._mappings.toArray().slice();
      var destGeneratedMappings = smc.__generatedMappings = [];
      var destOriginalMappings = smc.__originalMappings = [];

      for (var i = 0, length = generatedMappings.length; i < length; i++) {
        var srcMapping = generatedMappings[i];
        var destMapping = new Mapping;
        destMapping.generatedLine = srcMapping.generatedLine;
        destMapping.generatedColumn = srcMapping.generatedColumn;

        if (srcMapping.source) {
          destMapping.source = sources.indexOf(srcMapping.source);
          destMapping.originalLine = srcMapping.originalLine;
          destMapping.originalColumn = srcMapping.originalColumn;

          if (srcMapping.name) {
            destMapping.name = names.indexOf(srcMapping.name);
          }

          destOriginalMappings.push(destMapping);
        }

        destGeneratedMappings.push(destMapping);
      }

      quickSort(smc.__originalMappings, util.compareByOriginalPositions);

      return smc;
    };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  BasicSourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(BasicSourceMapConsumer.prototype, 'sources', {
    get: function () {
      return this._sources.toArray().map(function (s) {
        return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
      }, this);
    }
  });

  /**
   * Provide the JIT with a nice shape / hidden class.
   */
  function Mapping() {
    this.generatedLine = 0;
    this.generatedColumn = 0;
    this.source = null;
    this.originalLine = null;
    this.originalColumn = null;
    this.name = null;
  }

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  BasicSourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var length = aStr.length;
      var index = 0;
      var cachedSegments = {};
      var temp = {};
      var originalMappings = [];
      var generatedMappings = [];
      var mapping, str, segment, end, value;

      while (index < length) {
        if (aStr.charAt(index) === ';') {
          generatedLine++;
          index++;
          previousGeneratedColumn = 0;
        }
        else if (aStr.charAt(index) === ',') {
          index++;
        }
        else {
          mapping = new Mapping();
          mapping.generatedLine = generatedLine;

          // Because each offset is encoded relative to the previous one,
          // many segments often have the same encoding. We can exploit this
          // fact by caching the parsed variable length fields of each segment,
          // allowing us to avoid a second parse if we encounter the same
          // segment again.
          for (end = index; end < length; end++) {
            if (this._charIsMappingSeparator(aStr, end)) {
              break;
            }
          }
          str = aStr.slice(index, end);

          segment = cachedSegments[str];
          if (segment) {
            index += str.length;
          } else {
            segment = [];
            while (index < end) {
              base64VLQ.decode(aStr, index, temp);
              value = temp.value;
              index = temp.rest;
              segment.push(value);
            }

            if (segment.length === 2) {
              throw new Error('Found a source, but no line and column');
            }

            if (segment.length === 3) {
              throw new Error('Found a source and line, but no column');
            }

            cachedSegments[str] = segment;
          }

          // Generated column.
          mapping.generatedColumn = previousGeneratedColumn + segment[0];
          previousGeneratedColumn = mapping.generatedColumn;

          if (segment.length > 1) {
            // Original source.
            mapping.source = previousSource + segment[1];
            previousSource += segment[1];

            // Original line.
            mapping.originalLine = previousOriginalLine + segment[2];
            previousOriginalLine = mapping.originalLine;
            // Lines are stored 0-based
            mapping.originalLine += 1;

            // Original column.
            mapping.originalColumn = previousOriginalColumn + segment[3];
            previousOriginalColumn = mapping.originalColumn;

            if (segment.length > 4) {
              // Original name.
              mapping.name = previousName + segment[4];
              previousName += segment[4];
            }
          }

          generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            originalMappings.push(mapping);
          }
        }
      }

      quickSort(generatedMappings, util.compareByGeneratedPositionsDeflated);
      this.__generatedMappings = generatedMappings;

      quickSort(originalMappings, util.compareByOriginalPositions);
      this.__originalMappings = originalMappings;
    };

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  BasicSourceMapConsumer.prototype._findMapping =
    function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                           aColumnName, aComparator, aBias) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got '
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got '
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    };

  /**
   * Compute the last column for each generated mapping. The last column is
   * inclusive.
   */
  BasicSourceMapConsumer.prototype.computeColumnSpans =
    function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];

        // Mappings do not contain a field for the last generated columnt. We
        // can come up with an optimistic estimate, however, by assuming that
        // mappings are contiguous (i.e. given two consecutive mappings, the
        // first mapping ends where the second one starts).
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];

          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }

        // The last mapping for each line spans the entire line.
        mapping.lastGeneratedColumn = Infinity;
      }
    };

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  BasicSourceMapConsumer.prototype.originalPositionFor =
    function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      var index = this._findMapping(
        needle,
        this._generatedMappings,
        "generatedLine",
        "generatedColumn",
        util.compareByGeneratedPositionsDeflated,
        util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
      );

      if (index >= 0) {
        var mapping = this._generatedMappings[index];

        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source !== null) {
            source = this._sources.at(source);
            if (this.sourceRoot != null) {
              source = util.join(this.sourceRoot, source);
            }
          }
          var name = util.getArg(mapping, 'name', null);
          if (name !== null) {
            name = this._names.at(name);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: name
          };
        }
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  BasicSourceMapConsumer.prototype.hasContentsOfAllSources =
    function BasicSourceMapConsumer_hasContentsOfAllSources() {
      if (!this.sourcesContent) {
        return false;
      }
      return this.sourcesContent.length >= this._sources.size() &&
        !this.sourcesContent.some(function (sc) { return sc == null; });
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * availible.
   */
  BasicSourceMapConsumer.prototype.sourceContentFor =
    function SourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      if (!this.sourcesContent) {
        return null;
      }

      if (this.sourceRoot != null) {
        aSource = util.relative(this.sourceRoot, aSource);
      }

      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }

      var url;
      if (this.sourceRoot != null
          && (url = util.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }

      // This function is used recursively from
      // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
      // don't want to throw if we can't find the source - we just want to
      // return null, so we provide a flag to exit gracefully.
      if (nullOnMissing) {
        return null;
      }
      else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
   *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  BasicSourceMapConsumer.prototype.generatedPositionFor =
    function SourceMapConsumer_generatedPositionFor(aArgs) {
      var source = util.getArg(aArgs, 'source');
      if (this.sourceRoot != null) {
        source = util.relative(this.sourceRoot, source);
      }
      if (!this._sources.has(source)) {
        return {
          line: null,
          column: null,
          lastColumn: null
        };
      }
      source = this._sources.indexOf(source);

      var needle = {
        source: source,
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };

      var index = this._findMapping(
        needle,
        this._originalMappings,
        "originalLine",
        "originalColumn",
        util.compareByOriginalPositions,
        util.getArg(aArgs, 'bias', SourceMapConsumer.GREATEST_LOWER_BOUND)
      );

      if (index >= 0) {
        var mapping = this._originalMappings[index];

        if (mapping.source === needle.source) {
          return {
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          };
        }
      }

      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };

  exports.BasicSourceMapConsumer = BasicSourceMapConsumer;

  /**
   * An IndexedSourceMapConsumer instance represents a parsed source map which
   * we can query for information. It differs from BasicSourceMapConsumer in
   * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
   * input.
   *
   * The only parameter is a raw source map (either as a JSON string, or already
   * parsed to an object). According to the spec for indexed source maps, they
   * have the following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - file: Optional. The generated file this source map is associated with.
   *   - sections: A list of section definitions.
   *
   * Each value under the "sections" field has two fields:
   *   - offset: The offset into the original specified at which this section
   *       begins to apply, defined as an object with a "line" and "column"
   *       field.
   *   - map: A source map definition. This source map could also be indexed,
   *       but doesn't have to be.
   *
   * Instead of the "map" field, it's also possible to have a "url" field
   * specifying a URL to retrieve a source map from, but that's currently
   * unsupported.
   *
   * Here's an example source map, taken from the source map spec[0], but
   * modified to omit a section which uses the "url" field.
   *
   *  {
   *    version : 3,
   *    file: "app.js",
   *    sections: [{
   *      offset: {line:100, column:10},
   *      map: {
   *        version : 3,
   *        file: "section.js",
   *        sources: ["foo.js", "bar.js"],
   *        names: ["src", "maps", "are", "fun"],
   *        mappings: "AAAA,E;;ABCDE;"
   *      }
   *    }],
   *  }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
   */
  function IndexedSourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sections = util.getArg(sourceMap, 'sections');

    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    this._sources = new ArraySet();
    this._names = new ArraySet();

    var lastOffset = {
      line: -1,
      column: 0
    };
    this._sections = sections.map(function (s) {
      if (s.url) {
        // The url field will require support for asynchronicity.
        // See https://github.com/mozilla/source-map/issues/16
        throw new Error('Support for url field in sections not implemented.');
      }
      var offset = util.getArg(s, 'offset');
      var offsetLine = util.getArg(offset, 'line');
      var offsetColumn = util.getArg(offset, 'column');

      if (offsetLine < lastOffset.line ||
          (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
        throw new Error('Section offsets must be ordered and non-overlapping.');
      }
      lastOffset = offset;

      return {
        generatedOffset: {
          // The offset fields are 0-based, but we use 1-based indices when
          // encoding/decoding from VLQ.
          generatedLine: offsetLine + 1,
          generatedColumn: offsetColumn + 1
        },
        consumer: new SourceMapConsumer(util.getArg(s, 'map'))
      }
    });
  }

  IndexedSourceMapConsumer.prototype = Object.create(SourceMapConsumer.prototype);
  IndexedSourceMapConsumer.prototype.constructor = SourceMapConsumer;

  /**
   * The version of the source mapping spec that we are consuming.
   */
  IndexedSourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(IndexedSourceMapConsumer.prototype, 'sources', {
    get: function () {
      var sources = [];
      for (var i = 0; i < this._sections.length; i++) {
        for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
          sources.push(this._sections[i].consumer.sources[j]);
        }
      };
      return sources;
    }
  });

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  IndexedSourceMapConsumer.prototype.originalPositionFor =
    function IndexedSourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      // Find the section containing the generated position we're trying to map
      // to an original position.
      var sectionIndex = binarySearch.search(needle, this._sections,
        function(needle, section) {
          var cmp = needle.generatedLine - section.generatedOffset.generatedLine;
          if (cmp) {
            return cmp;
          }

          return (needle.generatedColumn -
                  section.generatedOffset.generatedColumn);
        });
      var section = this._sections[sectionIndex];

      if (!section) {
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      }

      return section.consumer.originalPositionFor({
        line: needle.generatedLine -
          (section.generatedOffset.generatedLine - 1),
        column: needle.generatedColumn -
          (section.generatedOffset.generatedLine === needle.generatedLine
           ? section.generatedOffset.generatedColumn - 1
           : 0),
        bias: aArgs.bias
      });
    };

  /**
   * Return true if we have the source content for every source in the source
   * map, false otherwise.
   */
  IndexedSourceMapConsumer.prototype.hasContentsOfAllSources =
    function IndexedSourceMapConsumer_hasContentsOfAllSources() {
      return this._sections.every(function (s) {
        return s.consumer.hasContentsOfAllSources();
      });
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * available.
   */
  IndexedSourceMapConsumer.prototype.sourceContentFor =
    function IndexedSourceMapConsumer_sourceContentFor(aSource, nullOnMissing) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];

        var content = section.consumer.sourceContentFor(aSource, true);
        if (content) {
          return content;
        }
      }
      if (nullOnMissing) {
        return null;
      }
      else {
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      }
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  IndexedSourceMapConsumer.prototype.generatedPositionFor =
    function IndexedSourceMapConsumer_generatedPositionFor(aArgs) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];

        // Only consider this section if the requested source is in the list of
        // sources of the consumer.
        if (section.consumer.sources.indexOf(util.getArg(aArgs, 'source')) === -1) {
          continue;
        }
        var generatedPosition = section.consumer.generatedPositionFor(aArgs);
        if (generatedPosition) {
          var ret = {
            line: generatedPosition.line +
              (section.generatedOffset.generatedLine - 1),
            column: generatedPosition.column +
              (section.generatedOffset.generatedLine === generatedPosition.line
               ? section.generatedOffset.generatedColumn - 1
               : 0)
          };
          return ret;
        }
      }

      return {
        line: null,
        column: null
      };
    };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  IndexedSourceMapConsumer.prototype._parseMappings =
    function IndexedSourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      this.__generatedMappings = [];
      this.__originalMappings = [];
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];
        var sectionMappings = section.consumer._generatedMappings;
        for (var j = 0; j < sectionMappings.length; j++) {
          var mapping = sectionMappings[i];

          var source = section.consumer._sources.at(mapping.source);
          if (section.consumer.sourceRoot !== null) {
            source = util.join(section.consumer.sourceRoot, source);
          }
          this._sources.add(source);
          source = this._sources.indexOf(source);

          var name = section.consumer._names.at(mapping.name);
          this._names.add(name);
          name = this._names.indexOf(name);

          // The mappings coming from the consumer for the section have
          // generated positions relative to the start of the section, so we
          // need to offset them to be relative to the start of the concatenated
          // generated file.
          var adjustedMapping = {
            source: source,
            generatedLine: mapping.generatedLine +
              (section.generatedOffset.generatedLine - 1),
            generatedColumn: mapping.column +
              (section.generatedOffset.generatedLine === mapping.generatedLine)
              ? section.generatedOffset.generatedColumn - 1
              : 0,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: name
          };

          this.__generatedMappings.push(adjustedMapping);
          if (typeof adjustedMapping.originalLine === 'number') {
            this.__originalMappings.push(adjustedMapping);
          }
        };
      };

      quickSort(this.__generatedMappings, util.compareByGeneratedPositionsDeflated);
      quickSort(this.__originalMappings, util.compareByOriginalPositions);
    };

  exports.IndexedSourceMapConsumer = IndexedSourceMapConsumer;

});

},{"./array-set":51,"./base64-vlq":52,"./binary-search":54,"./quick-sort":56,"./util":60,"amdefine":9}],58:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64VLQ = require('./base64-vlq');
  var util = require('./util');
  var ArraySet = require('./array-set').ArraySet;
  var MappingList = require('./mapping-list').MappingList;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }

  SourceMapGenerator.prototype._version = 3;

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap =
    function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function (mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };

        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }

          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };

          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }

        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping =
    function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);

      if (!this._skipValidation) {
        this._validateMapping(generated, original, source, name);
      }

      if (source != null && !this._sources.has(source)) {
        this._sources.add(source);
      }

      if (name != null && !this._names.has(name)) {
        this._names.add(name);
      }

      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent =
    function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }

      if (aSourceContent != null) {
        // Add the source content to the _sourcesContents map.
        // Create a new _sourcesContents map if the property is null.
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        // Remove the source file from the _sourcesContents map.
        // If the _sourcesContents map is empty, set the property to null.
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap =
    function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      // If aSourceFile is omitted, we will use the file property of the SourceMap
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error(
            'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
            'or the source map\'s "file" property. Both were omitted.'
          );
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      // Make "sourceFile" relative if an absolute Url is passed.
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      // Applying the SourceMap can add and remove items from the sources and
      // the names array.
      var newSources = new ArraySet();
      var newNames = new ArraySet();

      // Find mappings for the "sourceFile"
      this._mappings.unsortedForEach(function (mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          // Check if it can be mapped by the source map, then update the mapping.
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            // Copy mapping
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source)
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }

        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }

        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }

      }, this);
      this._sources = newSources;
      this._names = newNames;

      // Copy sourcesContents of applied map.
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile = util.join(aSourceMapPath, sourceFile);
          }
          if (sourceRoot != null) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping =
    function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
          && aGenerated.line > 0 && aGenerated.column >= 0
          && !aOriginal && !aSource && !aName) {
        // Case 1.
        return;
      }
      else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
               && aOriginal && 'line' in aOriginal && 'column' in aOriginal
               && aGenerated.line > 0 && aGenerated.column >= 0
               && aOriginal.line > 0 && aOriginal.column >= 0
               && aSource) {
        // Cases 2 and 3.
        return;
      }
      else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings =
    function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;

      var mappings = this._mappings.toArray();
      for (var i = 0, len = mappings.length; i < len; i++) {
        mapping = mappings[i];

        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        }
        else {
          if (i > 0) {
            if (!util.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }

        result += base64VLQ.encode(mapping.generatedColumn
                                   - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;

        if (mapping.source != null) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source)
                                     - previousSource);
          previousSource = this._sources.indexOf(mapping.source);

          // lines are stored 0-based in SourceMap spec version 3
          result += base64VLQ.encode(mapping.originalLine - 1
                                     - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;

          result += base64VLQ.encode(mapping.originalColumn
                                     - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;

          if (mapping.name != null) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name)
                                       - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }

      return result;
    };

  SourceMapGenerator.prototype._generateSourcesContent =
    function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function (source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents,
                                                    key)
          ? this._sourcesContents[key]
          : null;
      }, this);
    };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON =
    function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }

      return map;
    };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString =
    function SourceMapGenerator_toString() {
      return JSON.stringify(this.toJSON());
    };

  exports.SourceMapGenerator = SourceMapGenerator;

});

},{"./array-set":51,"./base64-vlq":52,"./mapping-list":55,"./util":60,"amdefine":9}],59:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
  var util = require('./util');

  // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
  // operating systems these days (capturing the result).
  var REGEX_NEWLINE = /(\r?\n)/;

  // Newline character code for charCodeAt() comparisons
  var NEWLINE_CODE = 10;

  // Private symbol for identifying `SourceNode`s when multiple versions of
  // the source-map library are loaded. This MUST NOT CHANGE across
  // versions!
  var isSourceNode = "$$$isSourceNode$$$";

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   * @param aRelativePath Optional. The path that relative sources in the
   *        SourceMapConsumer should be relative to.
   */
  SourceNode.fromStringWithSourceMap =
    function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      // The SourceNode we want to fill with the generated code
      // and the SourceMap
      var node = new SourceNode();

      // All even indices of this array are one line of the generated code,
      // while all odd indices are the newlines between two adjacent lines
      // (since `REGEX_NEWLINE` captures its match).
      // Processed fragments are removed from this array, by calling `shiftNextLine`.
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var shiftNextLine = function() {
        var lineContents = remainingLines.shift();
        // The last line of a file might not have a newline.
        var newLine = remainingLines.shift() || "";
        return lineContents + newLine;
      };

      // We need to remember the position of "remainingLines"
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;

      // The generate SourceNodes we need a code range.
      // To extract it current and last mapping is used.
      // Here we store the last mapping.
      var lastMapping = null;

      aSourceMapConsumer.eachMapping(function (mapping) {
        if (lastMapping !== null) {
          // We add the code from "lastMapping" to "mapping":
          // First check if there is a new line in between.
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            // Associate first line with "lastMapping"
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
            // The remaining code is added without mapping
          } else {
            // There is no new line in between.
            // Associate the code between "lastGeneratedColumn" and
            // "mapping.generatedColumn" with "lastMapping"
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn -
                                          lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn -
                                                lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            // No more remaining code, continue
            lastMapping = mapping;
            return;
          }
        }
        // We add the generated code until the first mapping
        // to the SourceNode without any mapping.
        // Each line is added as separate string.
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      // We have processed all mappings.
      if (remainingLines.length > 0) {
        if (lastMapping) {
          // Associate the remaining code in the current line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        // and add the remaining lines without any mapping
        node.add(remainingLines.join(""));
      }

      // Copy sourcesContent into SourceNode
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });

      return node;

      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          var source = aRelativePath
            ? util.join(aRelativePath, mapping.source)
            : mapping.source;
          node.add(new SourceNode(mapping.originalLine,
                                  mapping.originalColumn,
                                  source,
                                  code,
                                  mapping.name));
        }
      }
    };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function (chunk) {
        this.add(chunk);
      }, this);
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length-1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      }
      else {
        if (chunk !== '') {
          aFn(chunk, { source: this.source,
                       line: this.line,
                       column: this.column,
                       name: this.name });
        }
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len-1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    }
    else if (typeof lastChild === 'string') {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    }
    else {
      this.children.push(''.replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent =
    function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents =
    function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }

      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function (chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function (chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if(lastOriginalSource !== original.source
           || lastOriginalLine !== original.line
           || lastOriginalColumn !== original.column
           || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (var idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function (sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  exports.SourceNode = SourceNode;

});

},{"./source-map-generator":58,"./util":60,"amdefine":9}],60:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }
    url += '//';
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consequtive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = (path.charAt(0) === '/');

    var parts = path.split(/\/+/);
    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];
      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  }
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    if (aPath === "") {
      aPath = ".";
    }
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/'
      ? aPath
      : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  /**
   * Make a path relative to a URL or another path.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be made relative to aRoot.
   */
  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    aRoot = aRoot.replace(/\/$/, '');

    // It is possible for the path to be above the root. In this case, simply
    // checking whether the root is a prefix of the path won't work. Instead, we
    // need to remove components from the root one by one, until either we find
    // a prefix that fits, or we run out of components to remove.
    var level = 0;
    while (aPath.indexOf(aRoot + '/') !== 0) {
      var index = aRoot.lastIndexOf("/");
      if (index < 0) {
        return aPath;
      }

      // If the only part of the root that is left is the scheme (i.e. http://,
      // file:///, etc.), one or more slashes (/), or simply nothing at all, we
      // have exhausted all components, so the path is not relative to the root.
      aRoot = aRoot.slice(0, index);
      if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
        return aPath;
      }

      ++level;
    }

    // Make sure we add a "../" for each component we removed from the root.
    return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
  }
  exports.relative = relative;

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    return '$' + aStr;
  }
  exports.toSetString = toSetString;

  function fromSetString(aStr) {
    return aStr.substr(1);
  }
  exports.fromSetString = fromSetString;

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp = mappingA.source - mappingB.source;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0 || onlyCompareOriginal) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    return mappingA.name - mappingB.name;
  };
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings with deflated source and name indices where
   * the generated positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0 || onlyCompareGenerated) {
      return cmp;
    }

    cmp = mappingA.source - mappingB.source;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }

    return mappingA.name - mappingB.name;
  };
  exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

  function strcmp(aStr1, aStr2) {
    if (aStr1 === aStr2) {
      return 0;
    }

    if (aStr1 > aStr2) {
      return 1;
    }

    return -1;
  }

  /**
   * Comparator between two mappings with inflated source and name strings where
   * the generated positions are compared.
   */
  function compareByGeneratedPositionsInflated(mappingA, mappingB) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  };
  exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

});

},{"amdefine":9}],61:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":66}],62:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":86}],63:[function(require,module,exports){
var h = require("./virtual-hyperscript/index.js")

module.exports = h

},{"./virtual-hyperscript/index.js":73}],64:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":69}],65:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node.setAttribute(propName, propValue);
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":77,"is-object":48}],66:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":75,"../vnode/is-vnode.js":78,"../vnode/is-vtext.js":79,"../vnode/is-widget.js":80,"./apply-properties":65,"global/document":15}],67:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],68:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":80,"../vnode/vpatch.js":83,"./apply-properties":65,"./update-widget":70}],69:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":66,"./dom-index":67,"./patch-op":68,"global/document":15,"x-is-array":87}],70:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":80}],71:[function(require,module,exports){
'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

function EvHook(value) {
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};

},{"ev-store":14}],72:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],73:[function(require,module,exports){
'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    props = props || properties || {};
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        props.value = softSetHook(props.value);
    }

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }

    var result = new VNode(tag, props, childNodes, key, namespace);
    return result;
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

function isChildren(x) {
    return typeof x === 'string' || isArray(x) || isChild(x);
}

function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}

},{"../vnode/is-thunk":76,"../vnode/is-vhook":77,"../vnode/is-vnode":78,"../vnode/is-vtext":79,"../vnode/is-widget":80,"../vnode/vnode.js":82,"../vnode/vtext.js":84,"./hooks/ev-hook.js":71,"./hooks/soft-set-hook.js":72,"./parse-tag.js":74,"x-is-array":87}],74:[function(require,module,exports){
'use strict';

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
    if (!tag) {
        return 'DIV';
    }

    var noId = !(props.hasOwnProperty('id'));

    var tagParts = split(tag, classIdSplit);
    var tagName = null;

    if (notClassId.test(tagParts[1])) {
        tagName = 'DIV';
    }

    var classes, part, type, i;

    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];

        if (!part) {
            continue;
        }

        type = part.charAt(0);

        if (!tagName) {
            tagName = part;
        } else if (type === '.') {
            classes = classes || [];
            classes.push(part.substring(1, part.length));
        } else if (type === '#' && noId) {
            props.id = part.substring(1, part.length);
        }
    }

    if (classes) {
        if (props.className) {
            classes.push(props.className);
        }

        props.className = classes.join(' ');
    }

    return props.namespace ? tagName : tagName.toUpperCase();
}

},{"browser-split":10}],75:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":76,"./is-vnode":78,"./is-vtext":79,"./is-widget":80}],76:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],77:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],78:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":81}],79:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":81}],80:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],81:[function(require,module,exports){
module.exports = "2"

},{}],82:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":76,"./is-vhook":77,"./is-vnode":78,"./is-widget":80,"./version":81}],83:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":81}],84:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":81}],85:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }
        
        var aValue = a[aKey]
        var bValue = b[aKey]
        
        // [PHONEPACK] prevent reset input
        if (aKey === 'value'){
    		var value = document.getElementById(b.id).value;
    		b[aKey].value = value;
    		bValue = b[aKey];
        }

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":77,"is-object":48}],86:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":75,"../vnode/is-thunk":76,"../vnode/is-vnode":78,"../vnode/is-vtext":79,"../vnode/is-widget":80,"../vnode/vpatch":83,"./diff-props":85,"x-is-array":87}],87:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],88:[function(require,module,exports){
/* Zepto v1.0 - polyfill zepto detect event ajax form fx - zeptojs.com/license */

;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+|\s+$/g, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()





var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice, filter = emptyArray.filter,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,
    tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    rootNodeRE = /^(?:body|html)$/i,

    // special attributes that should be get/set via method calls
    methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]*)$/,
    tagSelectorRE = /^[\w-]+$/,
    class2type = {},
    toString = class2type.toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function type(obj) {
    return obj == null ? String(obj) :
      class2type[toString.call(obj)] || "object"
  }

  function isFunction(value) { return type(value) == "function" }
  function isWindow(obj)     { return obj != null && obj == obj.window }
  function isDocument(obj)   { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
  function isObject(obj)     { return type(obj) == "object" }
  function isPlainObject(obj) {
    return isObject(obj) && !isWindow(obj) && obj.__proto__ == Object.prototype
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return filter.call(array, function(item){ return item != null }) }
  function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return filter.call(array, function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  function children(element) {
    return 'children' in element ?
      slice.call(element.children) :
      $.map(element.childNodes, function(node){ if (node.nodeType == 1) return node })
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name, properties) {
    if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'

    var nodes, dom, container = containers[name]
    container.innerHTML = '' + html
    dom = $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
    if (isPlainObject(properties)) {
      nodes = $(dom)
      $.each(properties, function(key, value) {
        if (methodAttributes.indexOf(key) > -1) nodes[key](value)
        else nodes.attr(key, value)
      })
    }
    return dom
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = $.fn
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // Wrap DOM nodes. If a plain object is given, duplicate it.
      else if (isObject(selector))
        dom = [isPlainObject(selector) ? $.extend({}, selector) : selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, which makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  function extend(target, source, deep) {
    for (key in source)
      if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {
        if (isPlainObject(source[key]) && !isPlainObject(target[key]))
          target[key] = {}
        if (isArray(source[key]) && !isArray(target[key]))
          target[key] = []
        extend(target[key], source[key], deep)
      }
      else if (source[key] !== undefined) target[key] = source[key]
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    var deep, args = slice.call(arguments, 1)
    if (typeof target == 'boolean') {
      deep = target
      target = args.shift()
    }
    args.forEach(function(arg){ extend(target, arg, deep) })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (isDocument(element) && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : [] ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? [] :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  $.contains = function(parent, node) {
    return parent !== node && parent.contains(node)
  }

  function funcArg(context, arg, idx, payload) {
    return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  function setAttribute(node, name, value) {
    value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
  }

  // access className property while respecting SVGAnimatedString
  function className(node, value){
    var klass = node.className,
        svg   = klass && klass.baseVal !== undefined

    if (value === undefined) return svg ? klass.baseVal : klass
    svg ? (klass.baseVal = value) : (node.className = value)
  }

  // "true"  => true
  // "false" => false
  // "null"  => null
  // "42"    => 42
  // "42.5"  => 42.5
  // JSON    => parse if valid
  // String  => self
  function deserializeValue(value) {
    var num
    try {
      return value ?
        value == "true" ||
        ( value == "false" ? false :
          value == "null" ? null :
          !isNaN(num = Number(value)) ? num :
          /^[\[\{]/.test(value) ? $.parseJSON(value) :
          value )
        : value
    } catch(e) {
      return value
    }
  }

  $.type = type
  $.isFunction = isFunction
  $.isWindow = isWindow
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.isEmptyObject = function(obj) {
    var name
    for (name in obj) return false
    return true
  }

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.camelCase = camelize
  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0
  $.support = { }
  $.expr = { }

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  $.grep = function(elements, callback){
    return filter.call(elements, callback)
  }

  if (window.JSON) $.parseJSON = JSON.parse

  // Populate the class2type map
  $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type[ "[object " + name + "]" ] = name.toLowerCase()
  })

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    sort: emptyArray.sort,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $($.map(this, function(el, i){ return fn.call(el, i, el) }))
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      emptyArray.every.call(this, function(el, idx){
        return callback.call(el, idx, el) !== false
      })
      return this
    },
    filter: function(selector){
      if (isFunction(selector)) return this.not(this.not(selector))
      return $(filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    has: function(selector){
      return this.filter(function(){
        return isObject(selector) ?
          $.contains(this, selector) :
          $(this).find(selector).size()
      })
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result, $this = this
      if (typeof selector == 'object')
        result = $(selector).filter(function(){
          var node = this
          return emptyArray.some.call($this, function(parent){
            return $.contains(parent, node)
          })
        })
      else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return result
    },
    closest: function(selector, context){
      var node = this[0], collection = false
      if (typeof selector == 'object') collection = $(selector)
      while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))
        node = node !== context && !isDocument(node) && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return children(this) }), selector)
    },
    contents: function() {
      return this.map(function() { return slice.call(this.childNodes) })
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return filter.call(children(el.parentNode), function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return $.map(this, function(el){ return el[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(structure){
      var func = isFunction(structure)
      if (this[0] && !func)
        var dom   = $(structure).get(0),
            clone = dom.parentNode || this.length > 1

      return this.each(function(index){
        $(this).wrapAll(
          func ? structure.call(this, index) :
            clone ? dom.cloneNode(true) : dom
        )
      })
    },
    wrapAll: function(structure){
      if (this[0]) {
        $(this[0]).before(structure = $(structure))
        var children
        // drill down to the inmost element
        while ((children = structure.children()).length) structure = children.first()
        $(structure).append(this)
      }
      return this
    },
    wrapInner: function(structure){
      var func = isFunction(structure)
      return this.each(function(index){
        var self = $(this), contents = self.contents(),
            dom  = func ? structure.call(this, index) : structure
        contents.length ? contents.wrapAll(dom) : self.append(dom)
      })
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return this.map(function(){ return this.cloneNode(true) })
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return this.each(function(){
        var el = $(this)
        ;(setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
      })
    },
    prev: function(selector){ return $(this.pluck('previousElementSibling')).filter(selector || '*') },
    next: function(selector){ return $(this.pluck('nextElementSibling')).filter(selector || '*') },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
          else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ this.nodeType === 1 && setAttribute(this, name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] && this[0][name]) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? deserializeValue(data) : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this[0] && (this[0].multiple ?
           $(this[0]).find('option').filter(function(o){ return this.selected }).pluck('value') :
           this[0].value)
        ) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(coordinates){
      if (coordinates) return this.each(function(index){
        var $this = $(this),
            coords = funcArg(this, coordinates, index, $this.offset()),
            parentOffset = $this.offsetParent().offset(),
            props = {
              top:  coords.top  - parentOffset.top,
              left: coords.left - parentOffset.left
            }

        if ($this.css('position') == 'static') props['position'] = 'relative'
        $this.css(props)
      })
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: Math.round(obj.width),
        height: Math.round(obj.height)
      }
    },
    css: function(property, value){
      if (arguments.length < 2 && typeof property == 'string')
        return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      if (type(property) == 'string') {
        if (!value && value !== 0)
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)
      } else {
        for (key in property)
          if (!property[key] && property[key] !== 0)
            this.each(function(){ this.style.removeProperty(dasherize(key)) })
          else
            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
      }

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      return emptyArray.some.call(this, function(el){
        return this.test(className(el))
      }, classRE(name))
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = className(this), newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined) return className(this, '')
        classList = className(this)
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        className(this, classList.trim())
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var $this = $(this), names = funcArg(this, name, idx, className(this))
        names.split(/\s+/g).forEach(function(klass){
          (when === undefined ? !$this.hasClass(klass) : when) ?
            $this.addClass(klass) : $this.removeClass(klass)
        })
      })
    },
    scrollTop: function(){
      if (!this.length) return
      return ('scrollTop' in this[0]) ? this[0].scrollTop : this[0].scrollY
    },
    position: function() {
      if (!this.length) return

      var elem = this[0],
        // Get *real* offsetParent
        offsetParent = this.offsetParent(),
        // Get correct offsets
        offset       = this.offset(),
        parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

      // Subtract element margins
      // note: when an element has margin: auto the offsetLeft and marginLeft
      // are the same in Safari causing offset.left to incorrectly be 0
      offset.top  -= parseFloat( $(elem).css('margin-top') ) || 0
      offset.left -= parseFloat( $(elem).css('margin-left') ) || 0

      // Add offsetParent borders
      parentOffset.top  += parseFloat( $(offsetParent[0]).css('border-top-width') ) || 0
      parentOffset.left += parseFloat( $(offsetParent[0]).css('border-left-width') ) || 0

      // Subtract the two offsets
      return {
        top:  offset.top  - parentOffset.top,
        left: offset.left - parentOffset.left
      }
    },
    offsetParent: function() {
      return this.map(function(){
        var parent = this.offsetParent || document.body
        while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
          parent = parent.offsetParent
        return parent
      })
    }
  }

  // for now
  $.fn.detach = $.fn.remove

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, el = this[0],
        Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return isWindow(el) ? el['inner' + Dimension] :
        isDocument(el) ? el.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(operator, operatorIndex) {
    var inside = operatorIndex % 2 //=> prepend, append

    $.fn[operator] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var argType, nodes = $.map(arguments, function(arg) {
            argType = type(arg)
            return argType == "object" || argType == "array" || arg == null ?
              arg : zepto.fragment(arg)
          }),
          parent, copyByClone = this.length > 1
      if (nodes.length < 1) return this

      return this.each(function(_, target){
        parent = inside ? target : target.parentNode

        // convert all methods to a "before" operation
        target = operatorIndex == 0 ? target.nextSibling :
                 operatorIndex == 1 ? target.firstChild :
                 operatorIndex == 2 ? target :
                 null

        nodes.forEach(function(node){
          if (copyByClone) node = node.cloneNode(true)
          else if (!parent) return $(node).remove()

          traverseNode(parent.insertBefore(node, target), function(el){
            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
               (!el.type || el.type === 'text/javascript') && !el.src)
              window['eval'].call(window, el.innerHTML)
          })
        })
      })
    }

    // after    => insertAfter
    // prepend  => prependTo
    // before   => insertBefore
    // append   => appendTo
    $.fn[inside ? operator+'To' : 'insert'+(operatorIndex ? 'Before' : 'After')] = function(html){
      $(html)[operator](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.uniq = uniq
  zepto.deserializeValue = deserializeValue
  $.zepto = zepto

  return $
})()

// @@ original loader
// window.Zepto = Zepto
// '$' in window || (window.$ = Zepto)
// @@ modified by jiyinyiyong
module.exports.$ = Zepto;
module.exports.Zepto = Zepto;
// @@ modifications end


;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/),
      bb10 = ua.match(/(BB10).*Version\/([\d.]+)/),
      rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/),
      playbook = ua.match(/PlayBook/),
      chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/),
      firefox = ua.match(/Firefox\/([\d.]+)/)

    // Todo: clean this up with a better OS/browser seperation:
    // - discern (more) between multiple browsers on android
    // - decide if kindle fire in silk mode is android or not
    // - Firefox on Android doesn't specify the Android version
    // - possibly devide in os, device and browser hashes

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (bb10) os.bb10 = true, os.version = bb10[2]
    if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2]
    if (playbook) browser.playbook = true
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
    if (chrome) browser.chrome = true, browser.version = chrome[1]
    if (firefox) browser.firefox = true, browser.version = firefox[1]

    os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) || (firefox && ua.match(/Tablet/)))
    os.phone  = !!(!os.tablet && (android || iphone || webos || blackberry || bb10 ||
      (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) || (firefox && ua.match(/Mobile/))))
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)





;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={},
      hover = { mouseenter: 'mouseover', mouseleave: 'mouseout' }

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.type(events) != "string") $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function realEvent(type) {
    return hover[type] || type
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var handler   = parse(event)
      handler.fn    = fn
      handler.sel   = selector
      // emulate mouseenter, mouseleave
      if (handler.e in hover) fn = function(e){
        var related = e.relatedTarget
        if (!related || (related !== this && !$.contains(this, related)))
          return handler.fn.apply(this, arguments)
      }
      handler.del   = getDelegate && getDelegate(fn, event)
      var callback  = handler.del || fn
      handler.proxy = function (e) {
        var result = callback.apply(element, [e].concat(e.data))
        if (result === false) e.preventDefault(), e.stopPropagation()
        return result
      }
      handler.i = set.length
      set.push(handler)
      element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      ignoreProperties = /^([A-Z]|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var key, proxy = { originalEvent: event }
    for (key in event)
      if (!ignoreProperties.test(key) && event[key] !== undefined) proxy[key] = event[key]

    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.bind(event, selector || callback) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return !selector || $.isFunction(selector) ?
      this.unbind(event, selector || callback) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string' || $.isPlainObject(event)) event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      return callback ?
        this.bind(event, callback) :
        this.trigger(event)
    }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else this.each(function(){
        try { this[name]() }
        catch(e) {}
      })
      return this
    }
  })

  $.Event = function(type, props) {
    if (typeof type != 'string') props = type, type = props.type
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    event.isDefaultPrevented = function(){ return this.defaultPrevented }
    return event
  }

})(Zepto)





;(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    if (!('type' in options)) return $.ajax(options)

    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      cleanup = function() {
        clearTimeout(abortTimeout)
        $(script).remove()
        delete window[callbackName]
      },
      abort = function(type){
        cleanup()
        // In case of manual abort or timeout, keep an empty function as callback
        // so that the SCRIPT tag that eventually loads won't result in an error.
        if (!type || type == 'timeout') window[callbackName] = empty
        ajaxError(null, type || 'abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort')
      return false
    }

    window[callbackName] = function(data){
      cleanup()
      ajaxSuccess(data, xhr, options)
    }

    script.onerror = function() { abort('error') }

    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
      abort('timeout')
    }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true,
  }

  function mimeToDataType(mime) {
    if (mime) mime = mime.split(';', 2)[0]
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (options.processData && options.data && $.type(options.data) != "string")
      options.data = $.param(options.data, options.traditional)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)
    if (settings.cache === false) settings.url = appendQuery(settings.url, '_=' + Date.now())

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = settings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : $.parseJSON(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, xhr.status ? 'error' : 'abort', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  // handle optional data/success arguments
  function parseArguments(url, data, success, dataType) {
    var hasData = !$.isFunction(data)
    return {
      url:      url,
      data:     hasData  ? data : undefined,
      success:  !hasData ? data : $.isFunction(success) ? success : undefined,
      dataType: hasData  ? dataType || success : success
    }
  }

  $.get = function(url, data, success, dataType){
    return $.ajax(parseArguments.apply(null, arguments))
  }

  $.post = function(url, data, success, dataType){
    var options = parseArguments.apply(null, arguments)
    options.type = 'POST'
    return $.ajax(options)
  }

  $.getJSON = function(url, data, success){
    var options = parseArguments.apply(null, arguments)
    options.dataType = 'json'
    return $.ajax(options)
  }

  $.fn.load = function(url, data, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success
    if (parts.length > 1) options.url = parts[0], selector = parts[1]
    options.success = function(response){
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response)
      callback && callback.apply(self, arguments)
    }
    $.ajax(options)
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj)
    $.each(obj, function(key, value) {
      type = $.type(value)
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (type == "array" || (!traditional && type == "object"))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace(/%20/g, '+')
  }
})(Zepto)





;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)





;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming,
    animationName, animationDuration, animationTiming,
    cssReset = {}

  function dasherize(str) { return downcase(str.replace(/([a-z])([A-Z])/, '$1-$2')) }
  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  transform = prefix + 'transform'
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isPlainObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = (typeof duration == 'number' ? duration :
                    ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd

    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties
      cssValues[animationDuration] = duration + 's'
      cssValues[animationTiming] = (ease || 'linear')
      endEvent = $.fx.animationEnd
    } else {
      cssProperties = []
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) transforms += key + '(' + properties[key] + ') '
        else cssValues[key] = properties[key], cssProperties.push(dasherize(key))

      if (transforms) cssValues[transform] = transforms, cssProperties.push(transform)
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ')
        cssValues[transitionDuration] = duration + 's'
        cssValues[transitionTiming] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback)
      }
      $(this).css(cssReset)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft

    this.css(cssValues)

    if (duration <= 0) setTimeout(function() {
      that.each(function(){ wrappedCallback.call(this) })
    }, 0)

    return this
  }

  testEl = null
})(Zepto)

},{}],89:[function(require,module,exports){
var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var dom2hscript = require("dom2hscript");
var Handlebars = require('handlebars');
var $ = require('zepto-browserify').$;
var Observer = require("observe-js");
var clone = require('clone');

// 1: Create a function that declares what the DOM should look like
/*function render(count) {
    var input = h('input', {
        attributes: {
            "value": ""
        }
    }, '');
    return h('div', {}, [input, count]);
}

// 2: Initialise the document
var count = 0; // We need some app data. Here we just store a count.

var tree = render(count); // We need an initial tree
var rootNode = createElement(tree); // Create an initial root DOM node ...

document.body.appendChild(rootNode); // ... and it should be in the document

// 3: Wire up the update logic
setInterval(function() {
    count++;

    var newTree = render(count);
    var patches = diff(tree, newTree);
    rootNode = patch(rootNode, patches);
    tree = newTree;
}, 1000);*/

var PhonePack = (function() {

    function renderAttributes(template, controller) {
        var template = Handlebars.compile(template);
        var result = template(controller);
        return result;
    }

    return {

        selectors: {},

        createComponent: function(component) {
            var self = this;
            var renderComponent = '';
            var controller = null;

            self.selectors[component.selector] = component;
            self.selectors[component.selector].template = component.template;
            self.selectors[component.selector].render = component.template();

            // render inner components
            if (component.inject) {
                component.inject.forEach(function(selector) {

                    var pattern = new RegExp('<' + selector + '>(.*?)<\/' + selector + '>', 'g');
                    var test = pattern.test(self.selectors[component.selector].render);

                    if (test) {
                        renderComponent = self.selectors[component.selector].render.replace(pattern, self.selectors[selector].render);
                    }
                });
            }
            if (renderComponent) self.selectors[component.selector].render = renderComponent;

            //init component controller
            if (component.controller) {
                if (!self.selectors[component.selector].controllerInstance)
                    self.selectors[component.selector].controllerInstance = new component.controller();

                for (var attr in self.selectors[component.selector].controllerInstance) {
                    if (typeof self.selectors[component.selector].controllerInstance[attr] === 'function') {
                        Handlebars.registerHelper(attr, function(person) {
                            return new Handlebars.SafeString("(" +
                                self.selectors[component.selector].controllerInstance[attr].toString().replace(/\"/g, "'") + ")()");
                        });
                    }
                }

                if (!component.observer) {
                    var observer = new Observer.ObjectObserver(self.selectors[component.selector].controllerInstance);

                    observer.open(function(added, removed, changed, getOldValueFn) {

                        for (var component in self.selectors) {
                            self.createComponent(self.selectors[component]);
                        }

                        self.render(self.selectors[self.rootComponent.selector]);
                    });
                    component.observer = true;
                }

                self.selectors[component.selector].render = renderAttributes.call(self, self.selectors[component.selector].render, self.selectors[component.selector].controllerInstance);
            }
            console.log(dom2hscript.parseHTML(self.selectors[component.selector].render), self.selectors[component.selector].render)
            self.selectors[component.selector].tree = eval(dom2hscript.parseHTML(self.selectors[component.selector].render));
            return self.selectors[component.selector];
        },

        render: function(component, element) {
            var self = this;
            var id = 0;

            console.log(component)

            function setIds(c) {
                id++;
                if (!c.properties) c.properties = {};
                c.properties.id = id;
                if (c.children) {
                    c.children.forEach(function(child) {
                        if (child) {
                            setIds(child);
                        }
                    });
                }
            }

            if (self.rootComponent) {
                setIds(component.tree);
                var newTree = component.tree;
                var oldTree = self.rootComponent.tree;
                var patches = diff(oldTree, newTree);
                self.rootNode = patch(self.rootNode, patches);
            }
            else {
                setIds(component.tree);
                self.rootNode = createElement(component.tree);
                element.appendChild(self.rootNode);
            }

            self.rootComponent = clone(component);
        }
    };

})();

var Wellcome = PhonePack.createComponent({
    selector: 'wellcome',
    template: function() {
        return '<div> <button></button></div>'
    },
    controller: function() {
        var self = this;
    }
})

var TodoInput = PhonePack.createComponent({
    inject: ['wellcome'],
    selector: 'TodoInput',
    template: function() {
        return '<div><div><input value="{{ test }}" /> {{ test }}</div> <wellcome></wellcome> </div>';
    },
    controller: function() {
        this.test = 'input test';
    }
})

var App = PhonePack.createComponent({
    inject: ['TodoInput'],
    selector: 'App',
    template: function() {
        return '<div><div onclick="{{test}}"> Hello {{name}}</div> <TodoInput></TodoInput></div>';
    },
    controller: function() {
        var self = this;
        self.nome = 'Wagss';

        self.test = function() {
            console.log(self);
        }
    }
});



PhonePack.render(App, document.body);
},{"clone":11,"dom2hscript":12,"handlebars":45,"observe-js":49,"virtual-dom/create-element":61,"virtual-dom/diff":62,"virtual-dom/h":63,"virtual-dom/patch":64,"zepto-browserify":88}]},{},[89]);