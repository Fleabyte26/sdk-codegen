/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 Looker Data Sciences, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/** A transport is a generic way to make HTTP requests. */

// TODO create generic Headers and Request interfaces that are not transport-specific
// TODO create generic Agent that is not transport-specific
import { Agent } from 'https'
import { Headers } from 'request'
import { matchCharsetUtf8, matchModeBinary, matchModeString, sdkVersion } from './constants'
import { Readable } from "readable-stream"

export const agentTag = `TS-SDK ${sdkVersion}`
export const LookerAppId = 'x-looker-appid'

/**
 * Set to `true` to follow streaming process
 */
const tracing = false

/**
 * trivial tracing function that should be replaced with a log plugin
 * @param message description for trace
 * @param info any additional information to produce for output
 */
export function trace(message: string, info?: any) {
  if (tracing) {
    console.debug(message)
    if (info) {
      console.debug({ info })
    }
  }
}


/**
 * ResponseMode for an HTTP request - either binary or "string"
 */
export enum ResponseMode {
  'binary', // this is a binary response
  'string', // this is a "string" response
  'unknown' // unrecognized response type
}

/**
 * MIME patterns for string content types
 * @type {RegExp}
 */
export const contentPatternString = new RegExp(matchModeString, "i")

/**
 * MIME patterns for "binary" content types
 * @type {RegExp}
 */
export const contentPatternBinary = new RegExp(matchModeBinary, "i")

/**
 * MIME pattern for UTF8 charset attribute
 * @type {RegExp}
 */
export const charsetUtf8Pattern = new RegExp(matchCharsetUtf8, "i")

/**
 * Default request timeout
 * @type {number} default request timeout is 120 seconds, or two minutes
 */
export const defaultTimeout = 120

/**
 * Recognized HTTP methods
 */
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'TRACE'
  | 'HEAD'

/**
 * HTTP status codes
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status for reference
 * TODO is there a platform-agnostic list of these that can be used instead of this static declaration?
 */
export enum StatusCode {
  OK = 200,
  Created,
  Accepted,
  NonAuthoritative,
  NoContent,
  ResetContent,
  PartialContent,
  MultiStatus,
  MultiStatusDav,
  IMUsed = 226,
  MultipleChoice = 300,
  MovedPermanently,
  Found,
  SeeOther,
  NotModified,
  UseProxy,
  UnusedRedirect,
  TemporaryRedirect,
  PermanentRedirect,
  BadRequest = 400,
  Unauthorized,
  PaymentRequired,
  Forbidden,
  NotFound,
  MethodNotAllowed,
  NotAcceptable,
  ProxyAuthRequired,
  RequestTimeout,
  Conflict,
  Gone,
  LengthRequired,
  PreconditionFailed,
  PayloadTooLarge,
  UriTooLong,
  UnsupportedMediaType,
  RequestedRangeNotSatisfiable,
  ExpectationFailed,
  ImATeapot,
  MisdirectedRequest = 421,
  UnprocessableEntity,
  Locked,
  FailedDependency,
  TooEarly,
  UpgradeRequired,
  PreconditionRequired,
  TooManyRequests,
  RequestHeaderFieldsTooLarge,
  UnavailableForLegalReasons,
  InternalServerError = 500,
  NotImplemented,
  BadGateway,
  ServiceUnavailable,
  GatewayTimeout,
  HttpVersionNotSupported,
  VariantAlsoNegotiates,
  InsufficientStorage,
  LoopDetected,
  NotExtended = 510,
  NetworkAuthRequired
}

/**
 * Transport plug-in interface
 */
export interface ITransport {
  /**
   * HTTP request function for atomic, fully downloaded responses
   * @param method of HTTP request
   * @param path request path, either relative or fully specified
   * @param queryParams name/value pairs to pass as part of the URL
   * @param body data for the body of the request
   * @param authenticator authenticator callback, typically from `IAuthSession` implementation
   * @param options overrides of default transport settings
   * @returns typed response of `TSuccess`, or `TError` result
   */
  request<TSuccess, TError>(
    method: HttpMethod,
    path: string,
    queryParams?: Values,
    body?: any,
    authenticator?: Authenticator,
    options?: Partial<ITransportSettings>,
  ): Promise<SDKResponse<TSuccess, TError>>

  /**
   * HTTP request function for a streamable response
   * @param callback that receives the stream response and pipes it somewhere
   * @param method of HTTP request
   * @param path request path, either relative or fully specified
   * @param queryParams name/value pairs to pass as part of the URL
   * @param body data for the body of the request
   * @param authenticator authenticator callback, typically from `IAuthSession` implementation
   * @param options overrides of default transport settings
   * @returns `T` upon success
   * @throws `ISDKErrorResponse` on failure
   */
  stream<T>(
    callback: (readable: Readable) => Promise<T>,
    method: HttpMethod,
    path: string,
    queryParams?: Values,
    body?: any,
    authenticator?: Authenticator,
    options?: Partial<ITransportSettings>,
  ): Promise<T>

}

/** A successful SDK call. */
export interface ISDKSuccessResponse<T> {
  /** Whether the SDK call was successful. */
  ok: true
  /** The object returned by the SDK call. */
  value: T
}

/** An erroring SDK call. */
export interface ISDKErrorResponse<T> {
  /** Whether the SDK call was successful. */
  ok: false
  /** The error object returned by the SDK call. */
  error: T
}

/** An error representing an issue in the SDK, like a network or parsing error. */
export interface ISDKError {
  type: 'sdk_error'
  message: string
}

export type SDKResponse<TSuccess, TError> =
  | ISDKSuccessResponse<TSuccess>
  | ISDKErrorResponse<TError | ISDKError>

/**
 * Generic collection
 */
export interface IRequestHeaders {
  [key:string]: string
}

/**
 * Generic http request property collection
 * TOOD: Trim this down to what is required
 */
export interface IRequestProps {
  [key:string]: any
  /** full url for request, including any query params */
  url: string

  /** body of request. optional */
  body?: any;
  /** headers for request. optional */
  headers: IRequestHeaders;
  /** Http method for request. required. */
  method: HttpMethod;
  /** Redirect processing for request. optional */
  redirect?: any;

  /** http.Agent instance, allows custom proxy, certificate etc. */
  agent?: Agent;
  /** support gzip/deflate content encoding. false to disable */
  compress?: boolean;
  /** maximum redirect count. 0 to not follow redirect */
  follow?: number;
  /** maximum response body size in bytes */
  size?: number;
  /** req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies) */
  timeout?: number;
}

/** General purpose authentication callback */
export type Authenticator = (props: any) => any

/** Interface for API transport values */
export interface ITransportSettings {
  [key:string] : any,
  /** base URL of host address */
  base_url: string;
  /** api version */
  api_version: string;
  /** standard headers to provide in all transport requests */
  headers?: Headers;
  /** whether to verify ssl certs or not. Defaults to true */
  verify_ssl: boolean;
  /** request timeout in seconds. Default to 30 */
  timeout: number;
  /** encoding override */
  encoding?: string | null
}

/**
 * Is the content type binary or "string"?
 * @param {string} contentType
 * @returns {ResponseMode.binary | ResponseMode.string}
 */
export function responseMode(contentType: string) {
  if (contentType.match(contentPatternString)) {
    return ResponseMode.string
  }
  if (contentType.match(contentPatternBinary)) {
    return ResponseMode.binary
  }
  return ResponseMode.unknown
}

/**
 * Does this content type have a UTF-8 charset?
 * @param contentType
 * @returns match if it exists
 */
export function isUtf8(contentType: string) {
  return contentType.match(/;.*\bcharset\b=\butf-8\b/i)
}

/**
 * Used for name/value pair collections like for QueryParams
 */
export type Values = {[key:string]: any} | null | undefined

/**
 * Converts `Values` to query string parameter format
 * @param values Name/value collection to encode
 * @returns {string} query string parameter formatted values. Both `false` and `null` are included. Only `undefined` are omitted.
 */
export function encodeParams(values?: Values) {
  if (!values) return ""

  const keys = Object.keys(values)
  const params = keys
    .filter(k => values[k] !== undefined) // `null` and `false` will both be passe
    .map(k => k + '=' + encodeURIComponent(values[k]))
    .join('&')
  return params
}

/**
 * constructs the path argument including any optional query parameters
 * @param path the base path of the request
 * @param obj optional collection of query parameters to encode and append to the path
 */
export function addQueryParams(path: string, obj?: Values ) {
  if (!obj) {
    return path
  }
  const qp = encodeParams(obj)
  return `${path}${qp ? '?' + qp : ''}`
}

/**
 * SDK error handler
 * @param result any kind of error
 * @returns a new `Error` object with the failure message
 */
export function sdkError(result: any) {
  if ('message' in result && typeof result.message === 'string') {
    return new Error(result.message)
  }
  if ('error' in result && 'message' in result.error && typeof result.error.message === 'string') {
    return new Error(result.error.message)
  }
  const error = JSON.stringify(result)
  return new Error(`Unknown error with SDK method ${error}`)
}
