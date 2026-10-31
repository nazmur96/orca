import { app } from 'electron'

/** The updater would fetch stablyai's releases and replace the fork with stock Orca;
 *  fork builds update through the NixOS flake instead, so they behave like dev builds here. */
export function inAppUpdatesEnabled(): boolean {
  return app.isPackaged && process.env.ORCA_FORK_ALLOW_UPSTREAM_UPDATES === '1'
}
