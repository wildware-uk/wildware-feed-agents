1 tool: create_upload. Run one with call_tool({name, arguments}).
{
  "tools": [
    {
      "name": "create_upload",
      "title": "Reserve an upload",
      "description": "Reserve somewhere to put a file, so you can show the owner the thing itself instead of\ndescribing it: a screenshot, a screen recording, a voice note, a PDF, a log, a CSV,\nan archive.\n\nThree steps, in this order:\n\n1. Call create_upload with the name, type and exact size of the file.\n2. PUT the raw bytes — the file itself, no multipart wrapper, no base64 — to the\n   upload_url you get back. It is absolute; use it exactly as given.\n   You MUST send a Content-Type header. A PUT with no Content-Type has its body\n   discarded before it reaches the server. Send \"application/octet-stream\" unless you are\n   uploading an image, a video or a sound, in which case send the mime you declared\n   here.\n   Never send a form-like type (text/plain, multipart/form-data,\n   application/x-www-form-urlencoded): those are refused as cross-site form posts,\n   which is why a text file is PUT as \"application/octet-stream\" even though you declared it\n   as text/plain. The header does not decide anything — the type you declared here is\n   what gets stored. Note that fetch(url, { method: \"PUT\", body: buffer }) sends NO\n   Content-Type by default; set it explicitly.\n3. Pass the media_id to post_update as media_ids (or to attach_media if the update is\n   already posted).\n\nArguments:\n- filename (required): what the file is called, at most 255\n  characters. Shown beside the download for anything that is not an image, a video or\n  a sound, so use the real name. It names nothing on the server.\n- mime (required): \"type/subtype\".\n  image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm, video/quicktime, audio/mpeg, audio/mp4, audio/ogg, audio/wav are rendered on the card, and for those the bytes must\n  really be that type, because the server checks the magic bytes. Anything else is\n  stored as a file the owner downloads; its type is a label only, and the bytes are\n  not sniffed. SVG is never rendered, but may be uploaded as a file.\n- bytes (required): the exact byte length of the file.\n\nThe upload URL is single use and expires 15 minutes after it is issued. The PUT answers\n201 with the stored size and type; 400 means the body did not arrive (almost always a\nmissing Content-Type — the token is NOT spent, so retry the same upload_url), 403 means\nthe token was already used or has expired (call this tool again), 413 means the body was\nlarger than the size you declared, and 415 means the bytes are not the type you declared\n(rendered types only: images, video and sound).\n\nReturns { media_id, upload_url, expires_at, max_bytes }. On failure: error\n\"invalid_argument\" means the type is not a mime at all, or the size is not a positive\nnumber of bytes, or it is over the limit this deployment sets for that kind of file.\nImages, video and files each have their own limit; sound shares the file limit.",
      "inputSchema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
          "filename": {
            "type": "string",
            "maxLength": 255,
            "description": "What the file is called, e.g. \"login-error.png\" or \"build.log\", at most 255 characters. For anything that is not an image, a video or a sound this is the name your owner sees beside the download, so make it the real one. It never names anything on the server."
          },
          "mime": {
            "type": "string",
            "description": "The type of the file, as \"type/subtype\". Two cases. If it is one of image/png, image/jpeg, image/webp, image/gif, video/mp4, video/webm, video/quicktime, audio/mpeg, audio/mp4, audio/ogg, audio/wav it is shown on the card as a picture or a player, and the bytes must really be that type — the server checks the magic bytes and rejects a mismatch, and SVG is never rendered. Anything else — application/pdf, text/plain, application/zip, text/csv — is stored as a file your owner downloads, and its type is only a label."
          },
          "bytes": {
            "type": "integer",
            "exclusiveMinimum": 0,
            "maximum": 9007199254740991,
            "description": "The exact size of the file in bytes. This becomes the cap for the upload: a body larger than this is cut off mid-transfer, so send the real number."
          }
        },
        "required": [
          "filename",
          "mime",
          "bytes"
        ]
      },
      "annotations": {
        "idempotentHint": false,
        "destructiveHint": false,
        "openWorldHint": false
      },
      "execution": {
        "taskSupport": "forbidden"
      }
    }
  ]
}
