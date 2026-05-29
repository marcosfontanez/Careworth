export function friendlyLiveClipSettingsError(code: string | undefined | null): string {
  switch (code) {
    case 'unauthorized':
      return 'Sign in to change clip settings.';
    case 'forbidden':
      return 'Only the host can change clip settings for this stream.';
    case 'not_found':
      return 'Stream not found.';
    case 'stream_not_live':
      return 'Viewer clips can only be changed while the stream is live.';
    case 'stream_not_editable':
      return 'Clip settings cannot be changed for this stream right now.';
    case 'no_changes':
      return 'No settings were changed.';
    case 'migration_required':
    case 'rpc_failed':
      return 'Clip settings require migration 209 on the server.';
    default:
      return 'Could not update clip settings. Try again.';
  }
}

export function friendlyLiveClipDownloadError(code: string | undefined | null): string {
  switch (code) {
    case 'downloads_disabled':
      return 'Downloads are disabled for this stream.';
    case 'not_ready':
      return 'Download not available yet.';
    case 'forbidden':
      return 'You do not have access to download this clip.';
    case 'unauthorized':
      return 'Sign in to download clips.';
    default:
      return 'Could not download clip. Try again.';
  }
}
