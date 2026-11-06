import "colors";
import jwt from "jsonwebtoken";
import { getJWTSecret } from "#config/environment";


const [name, expiresIn] = process.argv.slice(2);

if (!name || !expiresIn) {
  console.error("Error: Invalid args.".red)
  console.error("Use: 'npm run token <name> <validate>' (ex.: npm run token maria 30d)");
  process.exit(1);
}

const token = jwt.sign({ sub: name }, getJWTSecret(), { expiresIn });
console.log(token);