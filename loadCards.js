const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'postgresql://postgres:GMqrZYroHjITZIjhnyXEcjinDFsbAayd@caboose.proxy.rlwy.net:59072/railway'
});

async function loadCards(filename = 'cards.json'){
    try{
        const cardsData = JSON.parse(fs.readFileSync(filename, 'utf8'));

        const colors = ['pink', 'blue', 'green'];

        const values = [];
        const params = [];
        let paramIndex = 1;

        cardsData.forEach(card => {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            values.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex + 7})`);
            params.push(
                card.word, 
                card.taboo[0], 
                card.taboo[1], 
                card.taboo[2], 
                card.taboo[3], 
                card.taboo[4],
                randomColor,
                false
            );
            paramIndex += 8;  
        });

        const query = `
            INSERT INTO taboo_cards (word, taboo_word_1, taboo_word_2, taboo_word_3, taboo_word_4, taboo_word_5, color,  used)
            VALUES ${values.join(', ')}
            ON CONFLICT (word) DO NOTHING
            RETURNING word;
        `;

        const result = await pool.query(query, params);

        console.log(`Inserted ${result.rowCount} new cards`);
        console.log(`Skipped ${cardsData.length - result.rowCount} duplicates`);
    } catch (err) {
        console.error('Error loading cards:', err);
    } finally {
        await pool.end();
    }   
}

loadCards(process.argv[2]);