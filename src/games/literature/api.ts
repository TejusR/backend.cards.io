import express from 'express'
import * as LiteratureController from './controller'
import * as LiteratureValidator from './validator'
import * as Validator from '../../util/validator'
import { Game, Player } from '../../engine'
import { GameService, PlayerService } from '../../services'

let router = express.Router()
let litNsp,
	gameData = {},
	socketIDMap = {}

var setupLiteratureGame = async (litNspObject) => {
	litNsp = litNspObject
	openSocketChannels()
	setUpdateEventListeners()
}

var getGameData = (gameCode: string): Game => {
	return gameData[gameCode]
}

var setGameData = (game: Game) => {
	gameData[game.code] = game
}

var removeGameData = (game: Game) => {
	delete gameData[game.code]
}

var filterLogs = (game: any) => {
	let result: string[] = []
	let count = 3
	for (let i = game.logs.length; i > 0; i--) {
		if (
			game.logs[i - 1].startsWith('ASK') ||
			game.logs[i - 1].startsWith('TAKE')
		) {
			if (count > 0) {
				result.push(game.logs[i])
				count--
			}
		} else {
			result.push(game.logs[i])
		}
	}
	game.logs = result.reverse()
}

var onGameUpdate = (game: any) => {
	filterLogs(game)
	litNsp.to(game.code).emit('game-data', {
		type: 'GAME',
		data: game
	})
}

var onPlayerUpdate = (player: any) => {
	let socketId = socketIDMap[player.id]
	litNsp.to(socketId).emit('player-data', {
		type: 'PLAYER',
		data: player
	})
}

var openSocketChannels = (): void => {
	litNsp.on('connection', (socket) => {
		socket.on('create', async (data) => {
			let playerName = data.name
			let playerPosition = 1
			let playerId = data.pid

			try {
				let player = await LiteratureController.registerPlayer(
					playerId,
					playerName,
					playerPosition
				)
				let game = await LiteratureController.hostGame(player)

				setGameData(game)
				socket.join(game.code)
				socketIDMap[socket.id] = playerId

				litNsp.to(socket.id).emit('game-updates', {
					code: 200,
					type: 'CREATE',
					gcode: game.code,
					pid: player.id,
					pname: player.name
				})
			} catch (err) {
				litNsp.to(socket.id).emit('game-updates', {
					type: 'CREATE',
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('probe', async (data) => {
			let gameCode = data.code

			try {
				let game = getGameData(gameCode)
				let response = game.getSpots()

				litNsp.to(socket.id).emit('game-probe', {
					code: 200,
					data: response
				})
			} catch (err) {
				litNsp.to(socket.id).emit('game-probe', {
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('join', async (data) => {
			let gameCode = data.code
			let playerName = data.name
			let playerPosition = data.position
			let playerId = data.pid

			try {
				let game = getGameData(gameCode)

				Validator.isPositionAvailable(game, playerPosition)
				let player = await LiteratureController.registerPlayer(
					playerId,
					playerName,
					playerPosition
				)
				await LiteratureController.joinGame(game, player)

				setGameData(game)
				socket.join(game.code)
				socketIDMap[socket.id] = playerId

				litNsp.to(game.code).emit('game-updates', {
					code: 200,
					type: 'JOIN',
					pname: player.name,
					position: player.position
				})
				let response = game.getSpots()
				litNsp.to(socket.id).emit('game-updates', {
					code: 200,
					type: 'LIST',
					data: response
				})
			} catch (err) {
				litNsp.to(socket.id).emit('game-updates', {
					type: 'JOIN',
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('leave', async (data) => {
			let gameCode = data.code
			let playerId = data.pid

			try {
				let game = getGameData(gameCode)
				let player = game.getPlayerById(playerId)
				await LiteratureController.joinGame(game, player)

				setGameData(game)
				socket.leave(game.code)
				socketIDMap[socket.id] = playerId

				litNsp.to(game.code).emit('game-updates', {
					code: 200,
					type: 'LEAVE',
					pname: player.name,
					position: player.position
				})
			} catch (err) {
				litNsp.to(socket.id).emit('game-updates', {
					type: 'LEAVE',
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('destroy', async (data) => {
			let gameCode = data.code
			let playerId = data.pid

			try {
				let game = getGameData(gameCode)
				let player = game.getPlayerById(playerId)

				Validator.isOwner(game, player)
				LiteratureController.destroyGame(game)

				removeGameData(game)
			} catch (err) {
				console.log('Unable to delete game')
			}
		})

		socket.on('start', (data) => {
			let gameCode = data.code
			let playerId = data.pid

			try {
				let game = getGameData(gameCode)
				let player = game.getPlayerById(playerId)

				Validator.isOwner(game, player)
				LiteratureController.startGame(game)

				setGameData(game)
				litNsp
					.to(gameCode)
					.emit('game-updates', { code: 200, type: 'START' })
			} catch (err) {
				litNsp.to(socket.id).emit('game-updates', {
					type: 'START',
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('play-ask', (data) => {
			let card = data.card
			let gameCode = data.code

			try {
				let game = getGameData(gameCode)
				let fromPlayer = game.getPlayerById(data.fid)
				let toPlayer = game.getPlayerByPosition(data.tpos)

				Validator.isMyTurn(game, fromPlayer)
				LiteratureValidator.canAsk(fromPlayer, card)
				LiteratureController.askForCard(
					game,
					fromPlayer,
					toPlayer,
					card
				)
				litNsp
					.to(socket.id)
					.emit('play-ask', { code: 200, type: 'ASK' })
			} catch (err) {
				litNsp.to(socket.id).emit('play-ask', {
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('play-declare', (data) => {
			let gameCode = data.code
			let playerId = data.pid
			let declaration = data.declaration

			try {
				let game = getGameData(gameCode)
				let from = game.getPlayerById(playerId)

				Validator.isMyTurn(game, from)
				let set = LiteratureValidator.checkSameSet(declaration)
				LiteratureController.declareSet(game, from, set, declaration)
				litNsp
					.to(socket.id)
					.emit('play-declare', { code: 200, type: 'DECLARE' })
			} catch (err) {
				litNsp.to(socket.id).emit('play-declare', {
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})

		socket.on('play-transfer', (data) => {
			let gameCode = data.code
			let fromId = data.fid
			let toPos = data.tpos

			try {
				let game = getGameData(gameCode)
				let from = game.getPlayerById(fromId)

				Validator.isMyTurn(game, from)
				let to = game.getPlayerByPosition(toPos)

				Validator.areSameTeam(from, to)
				LiteratureValidator.didJustDeclare(game)
				LiteratureController.transferTurn(game, from, to)
				litNsp
					.to(socket.id)
					.emit('play-transfer', { code: 200, type: 'TRANSFER' })
			} catch (err) {
				litNsp.to(socket.id).emit('play-transfer', {
					code: err.code,
					name: err.name,
					message: err.message
				})
			}
		})
	})
}

var setUpdateEventListeners = () => {
	GameService.setGameUpdatesCallback(onGameUpdate)
	PlayerService.setPlayerUpdatesCallback(onPlayerUpdate)
}

export { router as LiteratureRouter, setupLiteratureGame }
