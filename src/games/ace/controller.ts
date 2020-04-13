import { Deck, Player, Game } from '../../engine'
import { GameService, PlayerService } from '../../services'

var testAce = async () => {
	let po = await Player.build('Nandha', 2)
	let hostedGame = await hostGame(po, 2)
	var p1 = await Player.build('Naven', 3)
	await hostedGame.addPlayer(p1)
	var p2 = await Player.build('Vivek', 1)
	await hostedGame.addPlayer(p2)

	hostedGame.prepareGame()
}

var handleReconnect = async (id: string) => {
	let p = await PlayerService.pluckById(id)
	let g = await GameService.pluckById(p.game)
	return { player: p, game: g }
}

var registerPlayer = async (id: string, name: string, pos: number) => {
	try {
		var player = await PlayerService.getObjectById(id)
		player.updateDetails(name, pos)
	} catch (err) {
		player = await Player.build(name, pos)
	}
	return player
}

var hostGame = async (owner: Player, deckCount: number = 1) => {
	const gameType = 'ace'
	const deck = new Deck(true, deckCount)
	const minPlayers = 4
	const maxPlayers = 8
	const isTeamGame = false

	let g = await Game.build(
		gameType,
		deck,
		minPlayers,
		maxPlayers,
		isTeamGame,
		owner
	)
	g.decideStarter = function () {
		this._players.forEach((player) => {
			if (player.getIndexOf('AS') !== -1)
				this._currentTurn = player.position
		})
	}
	g.isGameOver = function () {
		let count = 0
		for (let i = 0; i < this._players.length; i++) {
			if (this._players[i].hand.length)
				if (count) return false
				else count++
		}
		return true
	}
	g.activePlayers = function () {
		let activePlayers = []
		this._players.forEach((player) => {
			if (player.hand.length) activePlayers.push(player)
		})
		return activePlayers
	}
	g.processRound = function () {
		let activePlayers = this._activePlayers()
		if (this._pile.length === activePlayers.length) this.discardPile()
		else {
			let highestCard = '0S',
				position = -1,
				splitPileLength = this._pile.length - 1
			this._pile.splice(0, -1).forEach((card, index) => {
				if (compareCards(card, highestCard)) {
					let activePlayerPosition =
						(this._currentTurn -
							(splitPileLength - index) +
							activePlayers.length) %
						activePlayers.length
					position = activePlayers[activePlayerPosition].position
				}
			})
		}
	}
	g.log('CREATE:' + owner.name)
	return g
}

var joinGame = async (game: Game, player: Player) => {
	await game.addPlayer(player)
	game.log('JOIN:' + player.name)
}

var leaveGame = async (game: Game, player: Player) => {
	let success = await game.removePlayer(player)
	if (success) {
		game.log('LEAVE:' + player.name)
		return true
	} else return false
}

var startGame = (game: Game) => {
	game.prepareGame()
	game.log('START')
}

var askForCard = (game: Game, from: Player, to: Player, card: string) => {
	try {
		from.add(to.discard(card))
		game.log('TAKE:' + from.name + ':' + to.name + ':' + card)
		console.log(from.name + ' took ' + card + ' from ' + to.name)
	} catch (err) {
		game.log('ASK:' + from.name + ':' + to.name + ':' + card)
		console.log(from.name + ' asked ' + to.name + ' for ' + card)
		game.currentTurn = to.position
	}
}

var transferTurn = (game: Game, from: Player, to: Player) => {
	game.currentTurn = to.position
	game.log('TRANSFER:' + from.name + ':' + to.name)
	console.log('Turn transferred to ' + to.name)
}

var declareSet = (
	game: Game,
	player: Player,
	set: string,
	declaration: string[][]
) => {
	game.log('ATTEMPT:' + player.name + ':' + set)
	let playerTeam = player.position % 2
	let successful = true
	for (let i = 0; i < declaration.length; i++) {
		let currentPos = 2 * (i + 1) - playerTeam
		for (let j = 0; j < declaration[i].length; j++) {
			let currentCard = declaration[i][j]
			let cardHolder = game.findCardWithPlayer(currentCard)
			if (cardHolder !== currentPos) {
				successful = false
			}
			game.getPlayerByPosition(cardHolder).discard(currentCard)
		}
	}
	if (successful) {
		player.score += 1
		game.log('DECLARE:' + player.name + ':' + set)
		console.log(player.name + ' correctly declared the ' + set)
	} else {
		let opponent = game.getPlayerByPosition(
			(player.position + 1) % game.players.length
		)
		opponent.score += 1
		game.currentTurn = opponent.position
		game.log('DECLARE:' + opponent.name + ':' + set)
		console.log(player.name + ' incorrectly declared the ' + set)
	}
	game.processRound()
}

var compareCards = (cardA, cardB) => {
	var valueA = getCardValue(cardA.slice(0, -1))
	var valueB = getCardValue(cardB.slice(0, -1))

	if (valueA >= valueB) return 1
	else return 0
}

var getCardValue = (rank) => {
	if (!isNaN(rank)) return parseInt(rank)
	else
		switch (rank) {
			case 'A':
				return 14
			case 'J':
				return 11
			case 'Q':
				return 12
			case 'K':
				return 13
			default:
				return 0
		}
}

export {
	handleReconnect,
	registerPlayer,
	hostGame,
	joinGame,
	leaveGame,
	startGame,
	askForCard,
	transferTurn,
	declareSet
}
