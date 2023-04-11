export namespace JsonSchemaFormats {
  export type StringFormat =
    | JsonSchemaFormatDate
    | JsonSchemaFormatTime
    | JsonSchemaFormatDateTime
    | JsonSchemaFormatIsoTime
    | JsonSchemaFormatIsoDateTime
    | JsonSchemaFormatDuration
    | JsonSchemaFormatUri
    | JsonSchemaFormatUriReference
    | JsonSchemaFormatUriTemplate
    | JsonSchemaFormatEmail
    | JsonSchemaFormatHostname
    | JsonSchemaFormatIpv4
    | JsonSchemaFormatIpv6
    | JsonSchemaFormatRegex
    | JsonSchemaFormatUuid
    | JsonSchemaFormatJsonPointer
    | JsonSchemaFormatRelativeJsonPointer
    | JsonSchemaFormatByte
    | JsonSchemaFormatPassword
    | JsonSchemaFormatBinary;

  export type NumberFormat =
    | JsonSchemaFormatInt32
    | JsonSchemaFormatInt64
    | JsonSchemaFormatFloat
    | JsonSchemaFormatDouble;

  /**
   * full-date according to [RFC3339](http://tools.ietf.org/html/rfc3339#section-5.6).
   */
  export type JsonSchemaFormatDate = 'date';
  /**
   * time (time-zone is mandatory).
   */
  export type JsonSchemaFormatTime = 'time';
  /**
   * date-time (time-zone is mandatory).
   */
  export type JsonSchemaFormatDateTime = 'date-time';
  /**
   * time with optional time-zone.
   */
  export type JsonSchemaFormatIsoTime = 'iso-time';
  /**
   * date-time with optional time-zone.
   */
  export type JsonSchemaFormatIsoDateTime = 'iso-date-time';
  /**
   * duration from [RFC3339](https://tools.ietf.org/html/rfc3339#appendix-A)
   */
  export type JsonSchemaFormatDuration = 'duration';
  /**
   * full URI.
   */
  export type JsonSchemaFormatUri = 'uri';
  /**
   * URI reference, including full and relative URIs.
   */
  export type JsonSchemaFormatUriReference = 'uri-reference';
  /**
   * URI template according to [RFC6570](https://tools.ietf.org/html/rfc6570)
   */
  export type JsonSchemaFormatUriTemplate = 'uri-template';
  /**
   * email address.
   */
  export type JsonSchemaFormatEmail = 'email';
  /**
   * host name according to [RFC1034](http://tools.ietf.org/html/rfc1034#section-3.5).
   */
  export type JsonSchemaFormatHostname = 'hostname';
  /**
   * IP address v4.
   */
  export type JsonSchemaFormatIpv4 = 'ipv4';
  /**
   * IP address v6.
   */
  export type JsonSchemaFormatIpv6 = 'ipv6';
  /**
   * tests whether a string is a valid regular expression by passing it to RegExp constructor.
   */
  export type JsonSchemaFormatRegex = 'regex';
  /**
   * Universally Unique IDentifier according to [RFC4122](http://tools.ietf.org/html/rfc4122).
   */
  export type JsonSchemaFormatUuid = 'uuid';
  /**
   * JSON-pointer according to [RFC6901](https://tools.ietf.org/html/rfc6901).
   */
  export type JsonSchemaFormatJsonPointer = 'json-pointer';
  /**
   * relative JSON-pointer according to [this draft](http://tools.ietf.org/html/draft-luff-relative-json-pointer-00).
   */
  export type JsonSchemaFormatRelativeJsonPointer = 'relative-json-pointer';
  /**
   * base64 encoded data according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatByte = 'byte';

  /**
   * password string according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatPassword = 'password';
  /**
   * binary string according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatBinary = 'binary';

  /**
   * signed 32 bits integer according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatInt32 = 'int32';
  /**
   * signed 64 bits according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatInt64 = 'int64';
  /**
   * float according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatFloat = 'float';
  /**
   * double according to the [openApi 3.0.0 specification](https://spec.openapis.org/oas/v3.0.0#data-export types)
   */
  export type JsonSchemaFormatDouble = 'double';
}
