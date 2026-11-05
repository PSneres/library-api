export function registerPoolEvents(pool) {
  pool.on("error", (err) => {
    console.error(`[DATABASE ERROR] ${err.message}`);
  });
}