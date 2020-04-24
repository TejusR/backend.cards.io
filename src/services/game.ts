import { Game, Player } from '../engine'
import { GameModel, PlayerModel } from '../models'
import { ChatService } from '.'

class DatabaseError extends Error {
	public code: number
	public scope: string
	constructor(code: number, scope: string, message: string) {
		super(message)
		this.code = code
		this.scope = scope
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = DatabaseError.name
	}
}

var create = async (game: Game, owner: Player, createdAt: Date) => {
	var gameObject = new GameModel({
		type: game.type,
		code: game.code,
		deck: game.deck.cards,
		pile: game.pile,
		currentTurn: game.currentTurn,
		minPlayers: game.minPlayers,
		maxPlayers: game.maxPlayers,
		logs: game.logs,
		isTeam: game.ifTeamGame,
		isActive: game.ifActive,
		createdAt: createdAt
	})
	try {
		var ownerDocument = await PlayerModel.findById(owner.id)
		if (!ownerDocument)
			throw new DatabaseError(
				500,
				'GET-GAME-OWNER',
				'Player does not exist'
			)
	} catch (err) {
		throw new DatabaseError(500, 'GET-GAME-OWNER', 'Unable to get Player')
	}

	gameObject.owner = ownerDocument

	try {
		var gameData = await gameObject.save()
		if (!gameData)
			throw new DatabaseError(500, 'SAVE-GAME', 'Unable to save game')
	} catch (err) {
		throw new DatabaseError(500, 'SAVE-GAME', 'Unable to save game')
	}

	return gameData
}

var assignOwner = async (gameId: string, ownerId: string) => {
	try {
		var gameObject = await GameModel.findById(gameId)
		if (!gameObject)
			throw new DatabaseError(
				500,
				'ASSIGN-GAME-OWNER',
				'Game does not exist'
			)
	} catch (err) {
		throw new DatabaseError(500, 'ASSIGN-GAME-OWNER', 'Game does not exist')
	}

	try {
		var ownerDocument = await PlayerModel.findById(ownerId)
		if (!ownerDocument)
			throw new DatabaseError(
				500,
				'ASSIGN-GAME-OWNER',
				'Player does not exist'
			)
	} catch (err) {
		throw new DatabaseError(
			500,
			'ASSIGN-GAME-OWNER',
			'Player does not exist'
		)
	}

	gameObject.owner = ownerDocument

	try {
		var gameData = await gameObject.save()
		if (!gameData)
			throw new DatabaseError(
				500,
				'ASSIGN-GAME-OWNER',
				'Unable to save game'
			)
	} catch (err) {
		throw new DatabaseError(500, 'ASSIGN-GAME-OWNER', 'Unable to save game')
	}
}

var addPlayer = async (gameId: string, playerId: string) => {
	try {
		var game = await GameModel.findById(gameId)
		var player = await PlayerModel.findById(playerId)
		if (!game || !player)
			throw new DatabaseError(
				500,
				'ADD-PLAYER',
				'Player or Game does not exist'
			)
	} catch (err) {
		throw new DatabaseError(
			500,
			'ADD-PLAYER',
			'Player or Game does not exist'
		)
	}
	player.game = game
	player.save()
}

var removePlayer = async (playerId: string) => {
	try {
		var player = await PlayerModel.findByIdAndUpdate(
			playerId,
			{
				$unset: { game: 1 }
			},
			{ new: true }
		)
		if (!player)
			throw new DatabaseError(
				500,
				'REMOVE-PLAYER',
				'Requested player does not exist'
			)
	} catch (err) {
		throw new DatabaseError(500, 'REMOVE-PLAYER', 'Unable to update game')
	}
}

var startGame = async (
	id: string,
	isActive: boolean,
	deck: string[],
	currentTurn: number
) => {
	try {
		var game = await GameModel.findByIdAndUpdate(
			id,
			{
				deck,
				isActive,
				currentTurn
			},
			{ new: true }
		)
		if (!game)
			throw new DatabaseError(500, 'START-GAME', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(500, 'START-GAME', 'Unable to update Game')
	}
}

var updateState = async (id: string, isActive: boolean) => {
	try {
		var game = await GameModel.findByIdAndUpdate(
			id,
			{
				isActive
			},
			{ new: true }
		)

		if (!game)
			throw new DatabaseError(500, 'UPDATE-STATE', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(
			500,
			'UPDATE-STATE',
			'Game could not be updated'
		)
	}
}

var updateTurn = async (id: string, currentTurn: number) => {
	try {
		var game = await GameModel.findByIdAndUpdate(
			id,
			{
				currentTurn
			},
			{ new: true }
		)

		if (!game)
			throw new DatabaseError(500, 'UPDATE-TURN', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(500, 'UPDATE-TURN', 'Game could not be updated')
	}
}

var updatePile = async (id: string, pile: string[]) => {
	try {
		var game = await GameModel.findByIdAndUpdate(
			id,
			{
				pile
			},
			{ new: true }
		)

		if (!game)
			throw new DatabaseError(500, 'UPDATE-PILE', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(500, 'UPDATE-PILE', 'Game could not be updated')
	}
}

var updateLogs = async (id: string, logs: string[]) => {
	try {
		var game = await GameModel.findByIdAndUpdate(
			id,
			{
				logs
			},
			{ new: true }
		)

		if (!game)
			throw new DatabaseError(500, 'UPDATE-LOGS', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(500, 'UPDATE-LOGS', 'Game could not be updated')
	}
}

var updateAdditionalData = async (id: string, additionalData) => {
	try {
		var game = await GameModel.findByIdAndUpdate(
			id,
			{
				additionalData
			},
			{ new: true }
		)

		if (!game)
			throw new DatabaseError(500, 'UPDATE-DATA', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(500, 'UPDATE-DATA', 'Game could not be updated')
	}
}

var getById = async (id: string) => {
	try {
		var g = await GameModel.findById(id)
		if (!g) throw new DatabaseError(500, 'GET-GAME', 'Game does not exist')
		g = g.toObject()
		g.id = id
	} catch (err) {
		throw new DatabaseError(500, 'GET-GAME', 'Could not get Game')
	}
	return g
}

var getByCode = async (code: string) => {
	try {
		var g = await GameModel.findOne({ code: code })
			.populate('owner')
			.populate('players')
		if (!g) throw new DatabaseError(500, 'GET-GAME', 'Game does not exist')
	} catch (err) {
		throw new DatabaseError(500, 'GET-GAME', 'Could not get Game')
	}
	return Game.fromModelObject(g)
}

var pluckById = async (id: string) => {
	try {
		var g = await GameModel.findById(id)
			.populate('owner', 'position')
			.populate('players', '-_id name position score hand')
			.select({
				code: 1,
				currentTurn: 1,
				logs: 1,
				isActive: 1,
				minPlayers: 1,
				additionalData: 1
			})
		if (!g)
			throw new DatabaseError(500, 'PLUCK-GAME', 'Game does not exist')
		g = g.toObject()
		delete g['_id']
		g.owner = g.owner.position
		g.players.forEach((element) => {
			element.count = element.hand.length
			delete element['game']
			delete element['hand']
		})
	} catch (err) {
		throw new DatabaseError(500, 'PLUCK-GAME', 'Could not get Game')
	}
	return g
}

var destroy = async (id: string) => {
	try {
		var g = await GameModel.findByIdAndDelete(id)
		await ChatService.destroyChats(id)
	} catch (err) {
		throw new DatabaseError(500, 'DESTROY-GAME', 'Unable to delete')
	}
}

export {
	create,
	assignOwner,
	addPlayer,
	removePlayer,
	getById,
	getByCode,
	startGame,
	updateState,
	updateTurn,
	updatePile,
	updateLogs,
	updateAdditionalData,
	destroy,
	pluckById
}
