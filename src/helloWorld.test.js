const { helloWorld } = require('./helloWorld');

test('hello world function returns correct string', () => {
	expect(helloWorld()).toBe('Hello, World!');
});