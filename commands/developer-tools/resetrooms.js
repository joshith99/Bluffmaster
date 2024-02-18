// Import necessary modules and dependencies
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MongoClient } = require('mongodb');

// Connect to MongoDB
let db;
async function connectToMongoDB() {
    const uri = 'mongodb://localhost:27017'; // Update with your MongoDB URI
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        db = client.db('discord_bot'); // Replace 'discord_bot' with your database name
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-rooms')
        .setDescription('Reset all game rooms'),

    async execute(interaction) {
        // Check if the command user has the necessary permissions (e.g., admin)
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to use this command.');
        }

        // Connect to MongoDB
        if (!db) await connectToMongoDB();

        try {
            // Remove all documents from the 'rooms' collection
            await db.collection('rooms').deleteMany({});
            interaction.reply('All game rooms have been reset.');
        } catch (error) {
            console.error('Error resetting game rooms:', error);
            interaction.reply('An error occurred while resetting game rooms.');
        }
    },
};
