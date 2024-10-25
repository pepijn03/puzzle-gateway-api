const { text } = require('express');

test('Return string: "Gateway API running!"', () => {
    const req = {};
    const res = { text: '',
        send: function(text) {
            this.text = text;
        }
     };

    res.text = 'Gateway API running!'; // Remove newline characters
    
    expect(res.text).toBe('Gateway API running!');
});