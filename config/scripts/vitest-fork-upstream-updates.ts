// Fork: packaged fork builds never self-update (src/main/fork/fork-in-app-updates.ts).
// Upstream's updater tests simulate a packaged app, so opt them back in to keep testing its logic.
process.env.ORCA_FORK_ALLOW_UPSTREAM_UPDATES = '1'
