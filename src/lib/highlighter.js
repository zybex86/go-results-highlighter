'use strict';

import { DEFAULT_SETTINGS, DOM_ATTRIBUTES, toPrefixedClasses, readTableSettingsFromDOM } from './settings';
import parse from './parser';
import convert from './raw2table';
import { asArray, defaults } from './utils';

export default class GoResultsHighlighter {

    /**
     * Creates new instance of GoResultsHighlighter
     *
     * @param {HTMLElement} element - main element containing table with results
     * @param {object} [settings] - plugin settings
     * @param {number} [settings.column=0] - index of the column
     * where the script should expect to find player's placement
     * @param {number} [settings.row=0] - starting row with players
     * @param {string} [settings.prefixCls='go-results-'] - css class prefix
     * @param {string} [settings.gameCls='game'] - game cell class name
     * @param {string} [settings.currentCls='current'] - selected row class name
     * @param {object} [settings.results] - map with possible results, by default
     * supports 4 options. Provide with "className" -> "regexp" pattern.
     * @param {string} [settings.results.won='([0-9]+)\\+'] - default winning regexp
     * @param {string} [settings.results.lost='([0-9]+)\\-'] - default losing regexp
     * @param {string} [settings.results.jigo='([0-9]+)='] - default draw regexp
     * @param {string} [settings.results.unresolved='([0-9]+)\\?] - default unresolved regexp
     * @param {string} [settings.rowTags='tr'] - querySelection-compatible string
     * with tags representing players' rows
     * @param {string} [settings.cellTags='td,th'] - querySelection-compatible
     * string with tags holding game results
     */
    constructor(element, settings) {
        this.settings = defaults(DEFAULT_SETTINGS, readTableSettingsFromDOM(element), settings);

        if (element instanceof HTMLPreElement) {
            let table = convert(element.innerHTML, settings);
            let parent = element.parentNode;

            parent.insertBefore(table, element);
            parent.removeChild(element);

            this.element = table;
        } else {
            this.element = element;
        }

        if (!this.element.classList) {
            // not supported
            return;
        }

        this.createPlayersMap();
        this.bindEvents();

        this.element.classList.add(this.settings.prefixCls + this.settings.tableCls);
        this.element.goResultsHighlighter = this;

        this.current = null;
        this.isShowingDetails = false;
        this.isHighlighting = false;
    }

    /**
     * Creates players map
     */
    createPlayersMap() {
        this.map = parse(this.element, this.settings);
        this.players = [];

        for (let placement in this.map) {
            if (this.map.hasOwnProperty(placement)) {
                this.players.push(this.map[placement]);
            }
        }
    }

    /**
     * Marks player and his opponents highlighted.
     * @param {object|number|null} [settings] - highlighting settings or player to be highlighted
     * @param {number} [settings.player] - player whose opponents should be
     * highlighted
     * @param {boolean} [settings.compact=false] - whether the table should be
     * rearranged to display results in compact size
     * @param {number} [settings.opponent] - the opponent whose game with the
     * player should be highlighted
     * @param {boolean} [compact=false] - if settings are not provided than this
     * argument is checked for compact flag
     */
    highlight(settings, compact = false) {
        let playerPlace;
        let gameWithOpponent;

        if (settings && typeof settings === 'object') {
            playerPlace = settings.player;
            compact = settings.compact === true;
            gameWithOpponent = settings.opponent;
        } else {
            playerPlace = settings;
        }

        const player = this.map[playerPlace];
        const classes = toPrefixedClasses(this.settings);

        // if table is already rearranged then transform it back to default state
        if (this.isShowingDetails) {
            restoreNaturalOrder(this.players);
        }

        // rearrange the table if player and appropriate setting is provided
        if (player && compact) {
            rearrangeOrder(player, player.opponents.map((opponentPlace) => this.map[opponentPlace]));

            this.element.classList.add(classes.showingDetailsCls);
            this.isShowingDetails = true;
        } else {
            this.element.classList.remove(classes.showingDetailsCls);
            this.isShowingDetails = false;
        }

        const markedGames = asArray(this.element.querySelectorAll('.' + classes.gameCls));
        const markedRow = this.element.querySelector('.' + classes.currentCls);
        const markedRowPlacement = markedRow ? markedRow.getAttribute(DOM_ATTRIBUTES.PLAYER_PLACEMENT) : null;
        const markedPlayer = markedRowPlacement ? this.map[markedRowPlacement] : null;
        const mark = (player, active) => {
            const method = active ? 'add' : 'remove';

            player.row.classList[method](classes.currentCls);

            player.opponents.forEach((opponentPlace) => {
                let opponent = this.map[opponentPlace];

                opponent.row.classList[method](this.settings.prefixCls + player.games[opponentPlace].cls);
            });
        };

        // remove any visible game markings
        markedGames.forEach((gameCell) => {
            gameCell.classList.remove(classes.gameCls);
        });

        // unmark player if necessary
        if (markedPlayer && markedPlayer !== player) {
            mark(markedPlayer, false);
        }

        // mark the player if not already marked
        if (player && player !== markedPlayer) {
            mark(player, true);
        }

        if (player) {
            if (gameWithOpponent && this.map[gameWithOpponent]) {
                let game = player.games[gameWithOpponent];
                let opponent = this.map[gameWithOpponent];

                if (game && opponent) {
                    game.cell.classList.add(classes.gameCls);
                    opponent.games[playerPlace].cell.classList.add(classes.gameCls);
                }
            } else if (this.isShowingDetails) {
                player.opponents.forEach((opponent) => {
                    this.map[opponent].games[playerPlace].cell.classList.add(classes.gameCls);
                });

            }

            this.current = playerPlace;
            this.isHighlighting = true;
        } else {
            this.current = null;
            this.isHighlighting = false;
        }
    }

    /**
     * Binds touchend, click, mouseover and mouseout events listeners to the element.
     */
    bindEvents() {
        let hasTouchMoved = false;

        this.element.addEventListener('touchstart', () => {
            hasTouchMoved = false;
        });

        this.element.addEventListener('touchmove', () => {
            hasTouchMoved = true;
        });

        this.element.addEventListener('touchend', (event) => {
            if (hasTouchMoved || (this.settings.clicking === false && this.settings.hovering === false)) {
                return;
            }

            let { target, player, opponent } = fetchInformationAboutTarget(event.target);

            if (!player) {
                return;
            }

            let compact = false;
            let lastTargetPos;

            if (this.current === player) {
                if (!this.settings.clicking || !this.settings.hovering) {
                    player = null;
                }
                compact = !this.isShowingDetails;

            } else if (this.isShowingDetails || !this.settings.hovering) {
                compact = true;
            }

            if (compact) {
                lastTargetPos = target.getBoundingClientRect().top;
            }

            this.highlight({ player, opponent, compact });

            if (lastTargetPos) {
                updateTopPosition(target, lastTargetPos);
            }

            event.preventDefault();
        });

        this.element.addEventListener('click', (event) => {
            if (this.settings.clicking === false) {
                return;
            }

            let { target, player, opponent } = fetchInformationAboutTarget(event.target);
            let compact = false;
            let lastTargetPos;

            if (!player) {
                return;
            }

            if (!this.isShowingDetails || target.properNextSibling) {
                compact = true;

            } else if (!this.settings.hovering) {
                player = null;
            }

            if (compact) {
                lastTargetPos = target.getBoundingClientRect().top;
            }

            this.highlight({ player, opponent, compact });

            if (lastTargetPos) {
                updateTopPosition(target, lastTargetPos);
            }
        });

        this.element.addEventListener('mouseover', (event) => {
            if (this.settings.hovering === false || this.isShowingDetails) {
                return;
            }

            let { player, opponent } = fetchInformationAboutTarget(event.target);

            if (!player) {
                return;
            }

            this.highlight({ player, opponent });
        }, false);

        this.element.addEventListener('mouseout', (event) => {
            if (this.settings.hovering === false || this.isShowingDetails) {
                return;
            }

            let target = event.relatedTarget;

            while (target && target !== document && target !== this.element) {
                target = target.parentNode;
            }

            // if new hovered element is outside the table then remove all
            // selections
            if (target !== this.element) {
                this.highlight(false);
            }
        }, false);
    }
}

/**
 * Compare current target's top position with previous value and scroll window
 * to previous value if it differs
 * @param {HTMLElement} target
 * @param {number} previousTop
 */
function updateTopPosition(target, previousTop) {
    let diff = target.getBoundingClientRect().top - previousTop;

    if (Math.abs(diff) > 10) {
        window.scrollBy(0, diff);
    }
}

/**
 * Retrieves information about player and opponent placement from provided element
 * or its parents. Returns also the row with player placement information.
 * @param {HTMLElement} target - target of the event
 * @returns {object}
 */
function fetchInformationAboutTarget(target) {
    var result = {
        player: null,
        opponent: null,
        target: null
    };

    // fetch information about hovered element
    while (target && target !== document) {
        let opponentGridPlacement = target.getAttribute(DOM_ATTRIBUTES.OPPONENT_PLACEMENT);
        let playerGridPlacement = target.getAttribute(DOM_ATTRIBUTES.PLAYER_PLACEMENT);

        // game cell?
        if (opponentGridPlacement) {
            result.opponent = Number(opponentGridPlacement);
        }

        // player row? no further search is necessary
        if (playerGridPlacement) {
            result.player = Number(playerGridPlacement);
            break;
        }

        target = target.parentNode;
    }

    result.target = target;

    return result;
}

/**
 * Restores default order of rows in the table
 * @param {Array.<object>} players - list of mapping data for all rows
 */
function restoreNaturalOrder(players) {
    players
        .filter((player) => player.row.properNextSibling)
        .reverse()
        .forEach((player) => {
            if (player.row.properNextSibling === -1) {
                player.row.parentNode.appendChild(player.row);
            } else {
                player.row.parentNode.insertBefore(player.row, player.row.properNextSibling);
            }
            player.row.properNextSibling = null;
        });
}

/**
 * Rearranges the rows in a table
 * @param {object} player - player mapping data
 * @param {Array.<object>} opponents - list of opponents mapping data
 */
function rearrangeOrder(player, opponents) {
    const parent = player.row.parentNode;
    let after = player.row.nextElementSibling;

    opponents.forEach((opponent) => {
        opponent.row.properNextSibling = opponent.row.nextElementSibling || -1;

        if (opponent.tournamentPlace < player.tournamentPlace) {
            parent.insertBefore(opponent.row, player.row);
        } else {
            parent.insertBefore(opponent.row, after);
            after = opponent.row.nextElementSibling;
        }
    });
}

GoResultsHighlighter.DEFAULT_SETTINGS = DEFAULT_SETTINGS;