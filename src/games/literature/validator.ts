import { Player, Game } from '../../engine'

class ValidationError extends Error {
	public code: number
	constructor(code: number, message: string) {
		super(message)
		this.code = code
		Object.setPrototypeOf(this, new.target.prototype)
		this.name = ValidationError.name
	}
}

const lc = ['2C', '3C', '4C', '5C', '6C', '7C']
const hc = ['9C', '10C', 'JC', 'QC', 'KC', 'AC']

const ld = ['2D', '3D', '4D', '5D', '6D', '7D']
const hd = ['9D', '10D', 'JD', 'QD', 'KD', 'AD']

const ls = ['2S', '3S', '4S', '5S', '6S', '7S']
const hs = ['9S', '10S', 'JS', 'QS', 'KS', 'AS']

const lh = ['2H', '3H', '4H', '5H', '6H', '7H']
const hh = ['9H', '10H', 'JH', 'QH', 'KH', 'AH']

const jok = ['8C', '8D', '8S', '8D', 'JOKER', 'JOKER']

var findBaseSet = (card: string) => {
	if (card.slice(0, 1) === '8' || card === 'JOKER') {
		return { set: jok, name: 'Jokers' }
	} else if (card.slice(-1) === 'C') {
		if (Number(card[0]) > 1 && Number(card[0]) < 8)
			return { set: lc, name: 'Low Clubs' }
		else return { set: hc, name: 'High Clubs' }
	} else if (card.slice(-1) === 'D') {
		if (Number(card[0]) > 1 && Number(card[0]) < 8)
			return { set: ld, name: 'Low Diamonds' }
		else return { set: hd, name: 'High Diamonds' }
	} else if (card.slice(-1) === 'S') {
		if (Number(card[0]) > 1 && Number(card[0]) < 8)
			return { set: ls, name: 'Low Spades' }
		else return { set: hs, name: 'High Spades' }
	} else {
		if (Number(card[0]) > 1 && Number(card[0]) < 8)
			return { set: lh, name: 'Low Hearts' }
		else return { set: hh, name: 'High Hearts' }
	}
}

const checkSameSet = (declaration: string[][]): string => {
	let baseCard = declaration[0][0]
	let baseSet = findBaseSet(baseCard)
	for (let i = 0; i < declaration.length; i++)
		for (let j = 0; j < declaration[i].length; j++)
			if (!baseSet.set.includes(declaration[i][j]))
				throw new ValidationError(
					400,
					'INVALID: Declaration should belong to same set'
				)

	return baseSet.name
}

const canAsk = (player: Player, toPlayer: Player, card: string) => {
	if (player.hand.includes(card))
		throw new ValidationError(400, 'INVALID: You already have the card')

	let baseSet: string[]
	baseSet = findBaseSet(card).set

	let intersection = player.hand.filter((c: string) => {
		return baseSet.includes(c)
	})
	if (intersection.length === 0)
		throw new ValidationError(400, 'INVALID: No base card')
}

const didJustDeclare = (game: Game) => {
	let lastLog = game.logs.slice(-1)[0]
	if (!lastLog.startsWith('DECLARE') && !lastLog.startsWith('TRANSFER'))
		throw new ValidationError(
			403,
			'INVALID: You can only transfer turn after declaring'
		)
}

export { canAsk, didJustDeclare, checkSameSet }
