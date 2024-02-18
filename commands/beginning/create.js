const { SlashCommandBuilder } = require('@discordjs/builders');
const { MongoClient } = require('mongodb');

let db;

// Connect to MongoDB
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

// Function to generate a random 4-digit room ID
function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-room')
        .setDescription('Create a game room'),

    async execute(interaction) {
        // Check if the interaction is from a guild
        if (!interaction.guild) {
            return interaction.reply('This command can only be used in a server (guild).');
        }

        // Connect to MongoDB
        if (!db) await connectToMongoDB();

        try {
            // Check if the user is already in a room
            const existingRoom = await db.collection('rooms').findOne({ members: { $in: [interaction.user.id] } });
            if (existingRoom) {
                return interaction.reply('Please leave your current room before creating a new one.');
            }

            // Generate a unique room ID
            const roomId = generateRoomId();

            // Create a new room document
            const newRoom = {
                id: roomId,
                members: [interaction.user.id]
            };

            // Insert the new room document into the 'rooms' collection
            await db.collection('rooms').insertOne(newRoom);

            // Send a message confirming the creation of the room
            await interaction.reply(`Game room created! Room ID: ${roomId}`);

            // Add reaction option to join the room
            const reply = await interaction.fetchReply();
            await reply.react('👤');

            // Create a reaction collector to handle joining the room
            const filter = (reaction, user) => reaction.emoji.name === '👤' && !user.bot;
            const collector = reply.createReactionCollector({ filter });

            // Handle reaction events
            collector.on('collect', async (reaction, user) => {
                // Check if the reaction is from a bot or the original message author
                if (user.bot || user.id === interaction.user.id) {
                    return;
                }

                // Check if the user is already in a room
                const existingRoom = await db.collection('rooms').findOne({ members: { $in: [user.id] } });
                if (existingRoom) {
                    await interaction.followUp({ content: 'You are already in a room.' });
                    return;
                }

                // Add the user to the room
                const updatedRoom = await db.collection('rooms').findOneAndUpdate(
                    { id: roomId },
                    { $addToSet: { members: user.id } },
                    { returnDocument: 'after' }
                );
                
                // Send a message confirming the user's addition to the room
                await interaction.followUp(`You have been added to room ${roomId}.`);
            });
        } catch (error) {
            console.error('Error creating game room:', error);
            interaction.reply('An error occurred while creating the game room.');
        }
    }
};
