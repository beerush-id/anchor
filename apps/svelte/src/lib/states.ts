import { anchor } from '@anchor/core';

export const userState = anchor({
	name: 'John Doe',
	age: 30,
	account: {
		balance: 1000
	}
});
