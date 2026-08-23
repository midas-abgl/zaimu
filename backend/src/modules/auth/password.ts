export const hashPassword = (password: string) =>
	Bun.password.hash(password, { algorithm: "bcrypt", cost: 12 });

export const verifyPassword = ({ hash, password }: { hash: string; password: string }) =>
	Bun.password.verify(password, hash);
