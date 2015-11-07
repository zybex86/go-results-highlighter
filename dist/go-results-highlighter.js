!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GoResultsHighlighter=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _plugin = _dereq_('./plugin');

var _plugin2 = _interopRequireDefault(_plugin);

var _settings = _dereq_('./settings');

var _utils = _dereq_('./utils');

function initialize() {
    var resultElements = (0, _utils.asArray)(document.querySelectorAll('[' + _settings.DOM_ATTRIBUTES.RESULT_TABLE + ']'));

    resultElements.forEach(function (tableEl) {
        tableEl.goResultsHighlighter = new _plugin2['default'](tableEl);
    });
}

if (document.readyState === 'complete') {
    initialize();
} else {
    document.addEventListener('DOMContentLoaded', initialize, false);
}

exports['default'] = _plugin2['default'];
module.exports = exports['default'];

},{"./plugin":3,"./settings":5,"./utils":6}],2:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports['default'] = parse;

var _utils = _dereq_('./utils');

var _settings = _dereq_('./settings');

function writeGridPlacement(row, placement) {
    row.setAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT, placement);
}

/**
 * Traverse provided table and create results map
 * @param {HTMLElement} table - table results container
 * @param {object} [config] - settings for parser
 * @param {string} [config.rowTags]
 * @param {string} [config.cellTags]
 * @param {object} [config.results]
 * @param {object} [config.placeColumn]
 * @param {object} [config.roundsColumns]
 * @param {object} [config.startingRow]
 * @returns {object}
 */

function parse(table, config) {
    var settings = (0, _utils.defaults)(_settings.DEFAULT_SETTINGS, config);
    var rows = (0, _utils.asArray)(table.querySelectorAll(settings.rowTags));
    var resultsMap = (0, _settings.toResultsWithRegExp)(settings.results);
    var resultsMapCount = resultsMap.length;
    var results = {};

    function parseGames(player, cells) {
        // if columns rounds are provided then parse only them
        if (typeof settings.roundsColumns === 'string') {
            cells = settings.roundsColumns.split(',').map(function (round) {
                return cells[Number(round)];
            });
        }

        cells.forEach(function (cell) {
            var opponentPlace = undefined;
            var resultCls = undefined;

            if (cell.hasAttribute(_settings.DOM_ATTRIBUTES.GAME_RESULT) && cell.hasAttribute(_settings.DOM_ATTRIBUTES.OPPONENT_PLACEMENT)) {
                opponentPlace = Number(cell.getAttribute(_settings.DOM_ATTRIBUTES.OPPONENT_PLACEMENT));
                resultCls = cell.getAttribute(_settings.DOM_ATTRIBUTES.GAME_RESULT);
            } else {
                for (var i = 0; i < resultsMapCount; i++) {
                    var match = cell.textContent.match(resultsMap[i].regexp);

                    if (!match) {
                        continue;
                    }

                    opponentPlace = Number(match[1]);
                    resultCls = resultsMap[i].cls;

                    cell.setAttribute(_settings.DOM_ATTRIBUTES.OPPONENT_PLACEMENT, opponentPlace);
                    cell.setAttribute(_settings.DOM_ATTRIBUTES.GAME_RESULT, resultsMap[i].cls);
                }

                if (!opponentPlace) {
                    return;
                }
            }

            player.games[opponentPlace] = {
                cell: cell,
                cls: resultCls
            };

            player.opponents.push(opponentPlace);
        });
    }

    var lastTournamentPlacement = undefined;
    var lastGridPlacement = undefined;

    rows.forEach(function (row, index) {
        if (index < settings.startingRow) {
            return;
        }

        var cells = (0, _utils.asArray)(row.querySelectorAll(settings.cellTags));

        // assign default place
        var gridPlacement = -1;

        // no cells? unlikely to be a result row
        if (!cells.length || !cells[settings.placeColumn]) {
            writeGridPlacement(row, gridPlacement);
            return;
        }

        var tournamentPlacement = parseInt(cells[settings.placeColumn].textContent, 10);

        var player = {
            tournamentPlace: -1,
            row: row,
            games: {},
            opponents: []
        };

        if (row.hasAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT)) {
            gridPlacement = Number(row.getAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT));
        } else {

            // if no player has been mapped
            if (!lastGridPlacement) {

                // most probably not a result row
                if (isNaN(tournamentPlacement)) {
                    return writeGridPlacement(row, gridPlacement);
                }

                // assign tournament if defined (possibly showing an extract from greater table)
                gridPlacement = tournamentPlacement || 1;
            } else {
                gridPlacement = lastGridPlacement + 1;
            }

            // assumption: if place is not provided then it's an ex aequo case but
            // we need to set a lower place nonetheless
            if (!tournamentPlacement) {
                tournamentPlacement = lastTournamentPlacement ? lastTournamentPlacement : 1;
            } else if (tournamentPlacement <= lastTournamentPlacement) {
                tournamentPlacement = lastTournamentPlacement;
            }

            writeGridPlacement(row, gridPlacement);
        }

        parseGames(player, cells);

        player.tournamentPlace = tournamentPlacement;
        player.opponents.sort(function (a, b) {
            return a > b ? 1 : -1;
        });

        results[gridPlacement] = player;

        lastTournamentPlacement = tournamentPlacement;
        lastGridPlacement = gridPlacement;
    });

    return results;
}

module.exports = exports['default'];

},{"./settings":5,"./utils":6}],3:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _settings = _dereq_('./settings');

var _parser = _dereq_('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _raw2table = _dereq_('./raw2table');

var _raw2table2 = _interopRequireDefault(_raw2table);

var _utils = _dereq_('./utils');

/**
 * Informs if the website is run on mobile browser.
 * @type {boolean}
 */
var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

var GoResultsHighlighter = (function () {

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

    function GoResultsHighlighter(element, settings) {
        _classCallCheck(this, GoResultsHighlighter);

        this.settings = (0, _utils.defaults)(_settings.DEFAULT_SETTINGS, (0, _settings.readTableSettingsFromDOM)(element), settings);

        if (element instanceof HTMLPreElement) {
            var table = (0, _raw2table2['default'])(element.innerHTML, settings);
            var _parent = element.parentNode;

            _parent.insertBefore(table, element);
            _parent.removeChild(element);

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
        this.showingDetails = false;
    }

    /**
     * Creates players map
     */

    _createClass(GoResultsHighlighter, [{
        key: 'createPlayersMap',
        value: function createPlayersMap() {
            this.map = (0, _parser2['default'])(this.element, this.settings);
            this.players = [];

            for (var placement in this.map) {
                if (this.map.hasOwnProperty(placement)) {
                    this.players.push(this.map[placement]);
                }
            }
        }

        /**
         * Marks the row for selected player and a cell with opponents game if
         * provided.
         * @param {number} [playerPlace] - player's place, selection will be remove
         * if not player is found for given place
         * @param {number} [opponentPlace] - player's opponent's place - to mark
         * cells with game between player and the opponent
         */
    }, {
        key: 'selectPlayer',
        value: function selectPlayer(playerPlace, opponentPlace) {
            var _this = this;

            var currentCls = this.settings.prefixCls + this.settings.currentCls;
            var gameCls = this.settings.prefixCls + this.settings.gameCls;

            var player = this.map[playerPlace];

            var markedGames = (0, _utils.asArray)(this.element.querySelectorAll('.' + gameCls));
            var markedRow = this.element.querySelector('.' + currentCls);
            var markedRowPlacement = markedRow ? markedRow.getAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT) : null;
            var markedPlayer = markedRowPlacement ? this.map[markedRowPlacement] : null;

            // remove any visible game markings
            markedGames.forEach(function (gameCell) {
                gameCell.classList.remove(gameCls);
            });

            // unmark player if necessary
            if (markedPlayer && markedPlayer !== player) {
                mark.call(this, markedPlayer, false);
            }

            // mark the player if not already marked
            if (player && player !== markedPlayer) {
                mark.call(this, player, true);
            }

            // mark all the games
            if (this.showingDetails) {
                player.opponents.forEach(function (opponent) {
                    _this.map[opponent].games[playerPlace].cell.classList.add(gameCls);
                });

                // mark the game between the player and the opponent
            } else if (player && opponentPlace) {
                    player.games[opponentPlace].cell.classList.add(gameCls);
                    this.map[opponentPlace].games[playerPlace].cell.classList.add(gameCls);
                }

            function mark(player, active) {
                var _this2 = this;

                var method = active ? 'add' : 'remove';

                player.row.classList[method](currentCls);

                player.opponents.forEach(function (opponentPlace) {
                    var opponent = _this2.map[opponentPlace];

                    opponent.row.classList[method](_this2.settings.prefixCls + player.games[opponentPlace].cls);
                });
            }
        }

        /**
         * Restores proper order of results
         */
    }, {
        key: 'restoreFullResults',
        value: function restoreFullResults() {
            this.players.filter(function (player) {
                return player.row.properNextSibling;
            }).reverse().forEach(function (player) {
                player.row.parentNode.insertBefore(player.row, player.row.properNextSibling);
                player.row.properNextSibling = null;
            });

            this.element.classList.remove(this.settings.prefixCls + this.settings.showingDetailsCls);
            this.showingDetails = false;
        }

        /**
         * Shows details for selected player
         * @param {number} [playerPlace]
         */
    }, {
        key: 'showDetails',
        value: function showDetails(playerPlace) {
            var _this3 = this;

            var player = this.map[playerPlace];

            if (!player) {
                return;
            }

            var parent = player.row.parentNode;
            var after = player.row.nextSibling;

            player.opponents.forEach(function (opponentPlace) {
                var opponent = _this3.map[opponentPlace];

                opponent.row.properNextSibling = opponent.row.nextSibling;

                if (opponentPlace < playerPlace) {
                    parent.insertBefore(opponent.row, player.row);
                } else {
                    parent.insertBefore(opponent.row, after);
                    after = opponent.row.nextSibling;
                }
            });

            // unfortunately applying classes on long tables is very expensive
            // operation causing lags. In order to provide better performance
            // feeling a class is not added when the table exceeds 100 rows.
            if (!isMobile || this.players.length < 100) {
                this.element.classList.add(this.settings.prefixCls + this.settings.showingDetailsCls);
            }

            this.showingDetails = true;
            this.selectPlayer(playerPlace);
        }

        /**
         * Binds mouseover and mouseout events listeners to the element.
         */
    }, {
        key: 'bindEvents',
        value: function bindEvents() {
            var _this4 = this;

            this.element.addEventListener('click', function (event) {
                if (_this4.settings.clicking === false) {
                    return;
                }

                if (_this4.showingDetails) {
                    _this4.restoreFullResults();
                    return;
                }

                var target = event.target;
                var playerPlacement = null;

                // fetch information about hovered element
                while (target && target !== document) {
                    var placement = target.getAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT);

                    // player row? no further search is necessary
                    if (placement) {
                        playerPlacement = placement;
                        break;
                    }

                    target = target.parentNode;
                }

                if (!playerPlacement) {
                    return;
                }

                _this4.showDetails(playerPlacement);
            });

            this.element.addEventListener('mouseover', function (event) {
                if (_this4.settings.hovering === false || _this4.showingDetails) {
                    return;
                }

                var target = event.target;
                var opponent = null;
                var player = null;

                // fetch information about hovered element
                while (target && target !== document) {
                    var opponentGridPlacement = target.getAttribute(_settings.DOM_ATTRIBUTES.OPPONENT_PLACEMENT);
                    var playerGridPlacement = target.getAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT);

                    // game cell?
                    if (opponentGridPlacement) {
                        opponent = opponentGridPlacement;
                    }

                    // player row? no further search is necessary
                    if (playerGridPlacement) {
                        player = playerGridPlacement;
                        break;
                    }

                    target = target.parentNode;
                }

                if (!player) {
                    return;
                }

                _this4.selectPlayer(player, opponent);
            }, false);

            this.element.addEventListener('mouseout', function (event) {
                if (_this4.settings.hovering === false || _this4.showingDetails) {
                    return;
                }

                var target = event.relatedTarget;

                while (target && target !== document && target !== _this4.element) {
                    target = target.parentNode;
                }

                // if new hovered element is outside the table then remove all
                // selections
                if (target !== _this4.element) {
                    _this4.selectPlayer(-1);
                }
            }, false);
        }
    }]);

    return GoResultsHighlighter;
})();

exports['default'] = GoResultsHighlighter;

GoResultsHighlighter.DEFAULT_SETTINGS = _settings.DEFAULT_SETTINGS;
module.exports = exports['default'];

},{"./parser":2,"./raw2table":4,"./settings":5,"./utils":6}],4:[function(_dereq_,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports['default'] = convertRawResultsToTable;

var _settings = _dereq_('./settings');

var _utils = _dereq_('./utils');

/**
 * Converts raw results string into table with rows and cells.
 * Returns null if not valid input.
 * @param {string} rawResults
 * @param {object} [config]
 * @param {number} [config.startingRow] - informs where is the first row with results
 * @param {number} [config.placeColumn] - informs in which column is the place located
 * @param {string} [config.roundsColumns] - comma separated list of columns where game results are located
 * @param {string} [config.cellSeparator='\t'] - separated used to divide rows into cells
 * @returns {HTMLElement|null}
 */

function convertRawResultsToTable(rawResults, config) {
    if (!rawResults) {
        return null;
    }

    var settings = (0, _utils.defaults)(_settings.DEFAULT_SETTINGS, config);
    var lines = rawResults.split(/\r\n|\n/);

    if (lines.length <= 2 && !lines[0] && !lines[1]) {
        return null;
    }

    var resultsMap = (0, _settings.toResultsWithRegExp)(settings.results);
    var resultsMapCount = resultsMap.length;
    var output = document.createElement('table');
    var rows = lines.map(function (line) {
        return line.split(settings.rowSeparator);
    });
    var tableWidth = rows.reduce(function (prev, line) {
        return Math.max(prev, line.length);
    }, 0);

    var gamesInColumns = null;

    // if columns rounds are provided then convert only them
    if (typeof settings.roundsColumns === 'string') {
        gamesInColumns = settings.roundsColumns.split(',').map(Number);
    }

    var previousPlace = undefined;

    rows.forEach(function (cells, index) {
        var row = document.createElement('tr');
        var width = cells.length;

        if (!width) {
            return;
        }

        if (width < tableWidth) {
            if (cells.length === 1 && !cells[0] || cells[0][0] === ';') {
                return;
            }

            var cell = document.createElement('td');

            cell.setAttribute('colspan', tableWidth);
            cell.textContent = cells.join(' ');

            row.setAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT, -1);
            row.appendChild(cell);
        } else {

            var place = parseInt(cells[settings.placeColumn], 10);

            if (index < settings.startingRow || isNaN(place) && !previousPlace) {
                cells.forEach(function (cellContent) {
                    var cell = document.createElement('td');

                    cell.textContent = cellContent;

                    row.setAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT, -1);
                    row.appendChild(cell);
                });
            } else {
                (function () {
                    row.setAttribute(_settings.DOM_ATTRIBUTES.PLAYER_PLACEMENT, previousPlace || place);

                    var opponents = [];

                    cells.forEach(function (cellContent, index) {
                        var cell = document.createElement('td');

                        cell.textContent = cellContent;

                        if (!gamesInColumns || gamesInColumns.indexOf(index) >= 0) {
                            for (var i = 0; i < resultsMapCount; i++) {
                                var match = cellContent.match(resultsMap[i].regexp);

                                if (!match) {
                                    continue;
                                }

                                var opponentPlacement = match[1];

                                opponents.push(opponentPlacement);
                                cell.setAttribute(_settings.DOM_ATTRIBUTES.OPPONENT_PLACEMENT, opponentPlacement);
                                cell.setAttribute(_settings.DOM_ATTRIBUTES.GAME_RESULT, resultsMap[i].cls);
                            }
                        }

                        row.appendChild(cell);
                    });

                    if (opponents.length) {
                        row.setAttribute(_settings.DOM_ATTRIBUTES.OPPONENTS, opponents.join(','));
                    }

                    if (!previousPlace) {
                        previousPlace = 2;
                    } else {
                        previousPlace += 1;
                    }
                })();
            }
        }

        output.appendChild(row);
    });

    output.setAttribute(_settings.DOM_ATTRIBUTES.RESULT_TABLE, '');

    return output;
}

module.exports = exports['default'];

},{"./settings":5,"./utils":6}],5:[function(_dereq_,module,exports){
'use strict';

/**
 * Default settings of the plugin
 * @type {{prefixCls: string, showingDetailsCls: string, tableCls: string, gameCls: string, currentCls: string, results: {won: string, lost: string, jigo: string, unresolved: string}, startingRow: number, placeColumn: number, roundsColumns: null, rowTags: string, cellTags: string, rowSeparator: string, hovering: boolean, clicking: boolean}}
 */
Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.toResultsWithRegExp = toResultsWithRegExp;
exports.readTableSettingsFromDOM = readTableSettingsFromDOM;
var DEFAULT_SETTINGS = {
    prefixCls: 'go-results-',
    showingDetailsCls: 'showing-details',
    tableCls: 'table',
    gameCls: 'game',
    currentCls: 'current',

    results: {
        won: '([0-9]+)\\+',
        lost: '([0-9]+)\\-',
        jigo: '([0-9]+)=',
        unresolved: '([0-9]+)\\?'
    },

    startingRow: 0,
    placeColumn: 0,
    roundsColumns: null,

    rowTags: 'tr',
    cellTags: 'td,th',
    rowSeparator: '\t',

    hovering: true,
    clicking: true
};

exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
/**
 * Names of attributes used in this plugin
 * @type {{RESULT_TABLE: string, SETTING_STARTING_ROW: string, SETTING_PLACE_COLUMN: string, SETTING_ROUNDS_COLUMNS: string, PLAYER_PLACEMENT: string, OPPONENT_PLACEMENT: string, GAME_RESULT: string}}
 */
var DOM_ATTRIBUTES = {
    RESULT_TABLE: 'data-go-results',
    SETTING_STARTING_ROW: 'data-go-starting-row',
    SETTING_PLACE_COLUMN: 'data-go-place-col',
    SETTING_ROUNDS_COLUMNS: 'data-go-rounds-cols',
    PLAYER_PLACEMENT: 'data-go-place',
    OPPONENT_PLACEMENT: 'data-go-opponent',
    OPPONENTS: 'data-go-opponents',
    GAME_RESULT: 'data-go-result'
};

exports.DOM_ATTRIBUTES = DOM_ATTRIBUTES;
/**
 * Transforms map of possible results into array of objects with regexp string
 * converted into RegExp objects.
 * @param {object} results
 * @returns {Array.<{cls: string, regexp: RegExp}>}
 */

function toResultsWithRegExp(results) {
    var map = [];

    for (var cls in results) {
        if (results.hasOwnProperty(cls)) {
            map.push({
                cls: cls,
                regexp: new RegExp(results[cls])
            });
        }
    }

    return map;
}

/**
 * Checks the element for 3 attributes and returns object with set appropriate
 * values
 * @param {HTMLElement} table
 * @returns {object}
 */

function readTableSettingsFromDOM(table) {
    var output = {};

    if (table.hasAttribute(DOM_ATTRIBUTES.SETTING_PLACE_COLUMN)) {
        output.placeColumn = Number(table.getAttribute(DOM_ATTRIBUTES.SETTING_PLACE_COLUMN));
    }

    if (table.hasAttribute(DOM_ATTRIBUTES.SETTING_STARTING_ROW)) {
        output.startingRow = Number(table.getAttribute(DOM_ATTRIBUTES.SETTING_STARTING_ROW));
    }

    if (table.hasAttribute(DOM_ATTRIBUTES.SETTING_ROUNDS_COLUMNS)) {
        output.roundsColumns = table.getAttribute(DOM_ATTRIBUTES.SETTING_ROUNDS_COLUMNS);
    }

    return output;
}

},{}],6:[function(_dereq_,module,exports){
'use strict';

/**
 * Transforms array-like objects (such as arguments or node lists) into an array
 * @param {*} arrayLike
 * @returns {Array.<T>}
 */
Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.asArray = asArray;
exports.defaults = defaults;
exports.combine = combine;

function asArray(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
}

/**
 * Returns new object containing keys only from defaultObj but values are taken
 * from if exist (starting from the last object provided)
 * @param {object} defaultObj
 * @param {Array.<object>} objects
 * @returns {object}
 */

function defaults(defaultObj) {
    for (var _len = arguments.length, objects = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        objects[_key - 1] = arguments[_key];
    }

    var overrides = objects.filter(function (obj) {
        return typeof obj === 'object';
    }).reverse();

    var count = overrides.length;
    var result = {};

    mainLoop: for (var key in defaultObj) {
        for (var i = 0; i < count; i++) {
            if (overrides[i].hasOwnProperty(key)) {
                result[key] = overrides[i][key];
                continue mainLoop;
            }
        }

        result[key] = defaultObj[key];
    }

    return result;
}

/**
 * Returns new object that has merged properties from all provided objects.
 * Latest arguments overrides the earlier values.
 * @param {Array.<object>} objects
 * @returns {object}
 */

function combine() {
    var result = {};

    for (var _len2 = arguments.length, objects = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        objects[_key2] = arguments[_key2];
    }

    objects.forEach(function (object) {
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                result[key] = object[key];
            }
        }
    });

    return result;
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkQ6XFxQcm9qZWt0eVxcZ28tcmVzdWx0cy1oaWdobGlnaHRlclxcbm9kZV9tb2R1bGVzXFxndWxwLWJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkQ6L1Byb2pla3R5L2dvLXJlc3VsdHMtaGlnaGxpZ2h0ZXIvc3JjL2Zha2VfNDczNDkyODIuanMiLCJEOi9Qcm9qZWt0eS9nby1yZXN1bHRzLWhpZ2hsaWdodGVyL3NyYy9wYXJzZXIuanMiLCJEOi9Qcm9qZWt0eS9nby1yZXN1bHRzLWhpZ2hsaWdodGVyL3NyYy9wbHVnaW4uanMiLCJEOi9Qcm9qZWt0eS9nby1yZXN1bHRzLWhpZ2hsaWdodGVyL3NyYy9yYXcydGFibGUuanMiLCJEOi9Qcm9qZWt0eS9nby1yZXN1bHRzLWhpZ2hsaWdodGVyL3NyYy9zZXR0aW5ncy5qcyIsIkQ6L1Byb2pla3R5L2dvLXJlc3VsdHMtaGlnaGxpZ2h0ZXIvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsWUFBWSxDQUFDOzs7Ozs7OztzQkFFb0IsVUFBVTs7Ozt3QkFDWixZQUFZOztxQkFDbkIsU0FBUzs7QUFFakMsU0FBUyxVQUFVLEdBQUc7QUFDbEIsUUFBTSxjQUFjLEdBQUcsb0JBQVEsUUFBUSxDQUFDLGdCQUFnQixPQUFLLHlCQUFlLFlBQVksT0FBSSxDQUFDLENBQUM7O0FBRTlGLGtCQUFjLENBQUMsT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFLO0FBQ2hDLGVBQU8sQ0FBQyxvQkFBb0IsR0FBRyx3QkFBeUIsT0FBTyxDQUFDLENBQUM7S0FDcEUsQ0FBQyxDQUFDO0NBQ047O0FBRUQsSUFBSSxRQUFRLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRTtBQUNwQyxjQUFVLEVBQUUsQ0FBQztDQUNoQixNQUFNO0FBQ0gsWUFBUSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztDQUNwRTs7Ozs7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QUFDLE1BQU0sRUFBSztBQUN4QixhQUFLLElBQUksR0FBRyxJQUFJLE1BQU0sRUFBRTtBQUNwQixnQkFBSSxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzVCLHNCQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzdCO1NBQ0o7S0FDSixDQUFDLENBQUM7O0FBRUgsV0FBTyxNQUFNLENBQUM7Q0FDakIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IEdvUmVzdWx0c0hpZ2hsaWdodGVyIGZyb20gJy4vcGx1Z2luJztcclxuaW1wb3J0IHsgRE9NX0FUVFJJQlVURVMgfSBmcm9tICcuL3NldHRpbmdzJztcclxuaW1wb3J0IHsgYXNBcnJheSB9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZSgpIHtcclxuICAgIGNvbnN0IHJlc3VsdEVsZW1lbnRzID0gYXNBcnJheShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKGBbJHtET01fQVRUUklCVVRFUy5SRVNVTFRfVEFCTEV9XWApKTtcclxuXHJcbiAgICByZXN1bHRFbGVtZW50cy5mb3JFYWNoKCh0YWJsZUVsKSA9PiB7XHJcbiAgICAgICAgdGFibGVFbC5nb1Jlc3VsdHNIaWdobGlnaHRlciA9IG5ldyBHb1Jlc3VsdHNIaWdobGlnaHRlcih0YWJsZUVsKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5pZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xyXG4gICAgaW5pdGlhbGl6ZSgpO1xyXG59IGVsc2Uge1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGluaXRpYWxpemUsIGZhbHNlKTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgR29SZXN1bHRzSGlnaGxpZ2h0ZXI7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuaW1wb3J0IHsgYXNBcnJheSwgZGVmYXVsdHMgfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgRE9NX0FUVFJJQlVURVMsIHRvUmVzdWx0c1dpdGhSZWdFeHAgfSBmcm9tICcuL3NldHRpbmdzJztcclxuXHJcbmZ1bmN0aW9uIHdyaXRlR3JpZFBsYWNlbWVudChyb3csIHBsYWNlbWVudCkge1xyXG4gICAgcm93LnNldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5QTEFZRVJfUExBQ0VNRU5ULCBwbGFjZW1lbnQpO1xyXG59XHJcblxyXG4vKipcclxuICogVHJhdmVyc2UgcHJvdmlkZWQgdGFibGUgYW5kIGNyZWF0ZSByZXN1bHRzIG1hcFxyXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSB0YWJsZSAtIHRhYmxlIHJlc3VsdHMgY29udGFpbmVyXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnXSAtIHNldHRpbmdzIGZvciBwYXJzZXJcclxuICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcucm93VGFnc11cclxuICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcuY2VsbFRhZ3NdXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnLnJlc3VsdHNdXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnLnBsYWNlQ29sdW1uXVxyXG4gKiBAcGFyYW0ge29iamVjdH0gW2NvbmZpZy5yb3VuZHNDb2x1bW5zXVxyXG4gKiBAcGFyYW0ge29iamVjdH0gW2NvbmZpZy5zdGFydGluZ1Jvd11cclxuICogQHJldHVybnMge29iamVjdH1cclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHBhcnNlKHRhYmxlLCBjb25maWcpIHtcclxuICAgIGNvbnN0IHNldHRpbmdzID0gZGVmYXVsdHMoREVGQVVMVF9TRVRUSU5HUywgY29uZmlnKTtcclxuICAgIGNvbnN0IHJvd3MgPSBhc0FycmF5KHRhYmxlLnF1ZXJ5U2VsZWN0b3JBbGwoc2V0dGluZ3Mucm93VGFncykpO1xyXG4gICAgY29uc3QgcmVzdWx0c01hcCA9IHRvUmVzdWx0c1dpdGhSZWdFeHAoc2V0dGluZ3MucmVzdWx0cyk7XHJcbiAgICBjb25zdCByZXN1bHRzTWFwQ291bnQgPSByZXN1bHRzTWFwLmxlbmd0aDtcclxuICAgIGNvbnN0IHJlc3VsdHMgPSB7fTtcclxuXHJcbiAgICBmdW5jdGlvbiBwYXJzZUdhbWVzKHBsYXllciwgY2VsbHMpIHtcclxuICAgICAgICAvLyBpZiBjb2x1bW5zIHJvdW5kcyBhcmUgcHJvdmlkZWQgdGhlbiBwYXJzZSBvbmx5IHRoZW1cclxuICAgICAgICBpZiAodHlwZW9mIHNldHRpbmdzLnJvdW5kc0NvbHVtbnMgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIGNlbGxzID0gc2V0dGluZ3Mucm91bmRzQ29sdW1uc1xyXG4gICAgICAgICAgICAgICAgLnNwbGl0KCcsJylcclxuICAgICAgICAgICAgICAgIC5tYXAoKHJvdW5kKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNlbGxzW051bWJlcihyb3VuZCldO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjZWxscy5mb3JFYWNoKChjZWxsKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBvcHBvbmVudFBsYWNlO1xyXG4gICAgICAgICAgICBsZXQgcmVzdWx0Q2xzO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChjZWxsLmhhc0F0dHJpYnV0ZShET01fQVRUUklCVVRFUy5HQU1FX1JFU1VMVCkgJiYgY2VsbC5oYXNBdHRyaWJ1dGUoRE9NX0FUVFJJQlVURVMuT1BQT05FTlRfUExBQ0VNRU5UKSkge1xyXG4gICAgICAgICAgICAgICAgb3Bwb25lbnRQbGFjZSA9IE51bWJlcihjZWxsLmdldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5PUFBPTkVOVF9QTEFDRU1FTlQpKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdENscyA9IGNlbGwuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLkdBTUVfUkVTVUxUKTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlc3VsdHNNYXBDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hdGNoID0gY2VsbC50ZXh0Q29udGVudC5tYXRjaChyZXN1bHRzTWFwW2ldLnJlZ2V4cCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2gpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBvcHBvbmVudFBsYWNlID0gTnVtYmVyKG1hdGNoWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRDbHMgPSByZXN1bHRzTWFwW2ldLmNscztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5zZXRBdHRyaWJ1dGUoRE9NX0FUVFJJQlVURVMuT1BQT05FTlRfUExBQ0VNRU5ULCBvcHBvbmVudFBsYWNlKTtcclxuICAgICAgICAgICAgICAgICAgICBjZWxsLnNldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5HQU1FX1JFU1VMVCwgcmVzdWx0c01hcFtpXS5jbHMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghb3Bwb25lbnRQbGFjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcGxheWVyLmdhbWVzW29wcG9uZW50UGxhY2VdID0ge1xyXG4gICAgICAgICAgICAgICAgY2VsbCxcclxuICAgICAgICAgICAgICAgIGNsczogcmVzdWx0Q2xzXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBwbGF5ZXIub3Bwb25lbnRzLnB1c2gob3Bwb25lbnRQbGFjZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGxhc3RUb3VybmFtZW50UGxhY2VtZW50O1xyXG4gICAgbGV0IGxhc3RHcmlkUGxhY2VtZW50O1xyXG5cclxuICAgIHJvd3MuZm9yRWFjaCgocm93LCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGlmIChpbmRleCA8IHNldHRpbmdzLnN0YXJ0aW5nUm93KSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNlbGxzID0gYXNBcnJheShyb3cucXVlcnlTZWxlY3RvckFsbChzZXR0aW5ncy5jZWxsVGFncykpO1xyXG5cclxuICAgICAgICAvLyBhc3NpZ24gZGVmYXVsdCBwbGFjZVxyXG4gICAgICAgIGxldCBncmlkUGxhY2VtZW50ID0gLTE7XHJcblxyXG4gICAgICAgIC8vIG5vIGNlbGxzPyB1bmxpa2VseSB0byBiZSBhIHJlc3VsdCByb3dcclxuICAgICAgICBpZiAoIWNlbGxzLmxlbmd0aCB8fCAhY2VsbHNbc2V0dGluZ3MucGxhY2VDb2x1bW5dKSB7XHJcbiAgICAgICAgICAgIHdyaXRlR3JpZFBsYWNlbWVudChyb3csIGdyaWRQbGFjZW1lbnQpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgdG91cm5hbWVudFBsYWNlbWVudCA9IHBhcnNlSW50KGNlbGxzW3NldHRpbmdzLnBsYWNlQ29sdW1uXS50ZXh0Q29udGVudCwgMTApO1xyXG5cclxuICAgICAgICBjb25zdCBwbGF5ZXIgPSB7XHJcbiAgICAgICAgICAgIHRvdXJuYW1lbnRQbGFjZTogLTEsXHJcbiAgICAgICAgICAgIHJvdyxcclxuICAgICAgICAgICAgZ2FtZXM6IHt9LFxyXG4gICAgICAgICAgICBvcHBvbmVudHM6IFtdXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKHJvdy5oYXNBdHRyaWJ1dGUoRE9NX0FUVFJJQlVURVMuUExBWUVSX1BMQUNFTUVOVCkpIHtcclxuICAgICAgICAgICAgZ3JpZFBsYWNlbWVudCA9IE51bWJlcihyb3cuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLlBMQVlFUl9QTEFDRU1FTlQpKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIC8vIGlmIG5vIHBsYXllciBoYXMgYmVlbiBtYXBwZWRcclxuICAgICAgICAgICAgaWYgKCFsYXN0R3JpZFBsYWNlbWVudCkge1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIG1vc3QgcHJvYmFibHkgbm90IGEgcmVzdWx0IHJvd1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKHRvdXJuYW1lbnRQbGFjZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdyaXRlR3JpZFBsYWNlbWVudChyb3csIGdyaWRQbGFjZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFzc2lnbiB0b3VybmFtZW50IGlmIGRlZmluZWQgKHBvc3NpYmx5IHNob3dpbmcgYW4gZXh0cmFjdCBmcm9tIGdyZWF0ZXIgdGFibGUpXHJcbiAgICAgICAgICAgICAgICBncmlkUGxhY2VtZW50ID0gdG91cm5hbWVudFBsYWNlbWVudCB8fCAxO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZ3JpZFBsYWNlbWVudCA9IGxhc3RHcmlkUGxhY2VtZW50ICsgMTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gYXNzdW1wdGlvbjogaWYgcGxhY2UgaXMgbm90IHByb3ZpZGVkIHRoZW4gaXQncyBhbiBleCBhZXF1byBjYXNlIGJ1dFxyXG4gICAgICAgICAgICAvLyB3ZSBuZWVkIHRvIHNldCBhIGxvd2VyIHBsYWNlIG5vbmV0aGVsZXNzXHJcbiAgICAgICAgICAgIGlmICghdG91cm5hbWVudFBsYWNlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgdG91cm5hbWVudFBsYWNlbWVudCA9IGxhc3RUb3VybmFtZW50UGxhY2VtZW50ID8gbGFzdFRvdXJuYW1lbnRQbGFjZW1lbnQgOiAxO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0b3VybmFtZW50UGxhY2VtZW50IDw9IGxhc3RUb3VybmFtZW50UGxhY2VtZW50KSB7XHJcbiAgICAgICAgICAgICAgICB0b3VybmFtZW50UGxhY2VtZW50ID0gbGFzdFRvdXJuYW1lbnRQbGFjZW1lbnQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHdyaXRlR3JpZFBsYWNlbWVudChyb3csIGdyaWRQbGFjZW1lbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGFyc2VHYW1lcyhwbGF5ZXIsIGNlbGxzKTtcclxuXHJcbiAgICAgICAgcGxheWVyLnRvdXJuYW1lbnRQbGFjZSA9IHRvdXJuYW1lbnRQbGFjZW1lbnQ7XHJcbiAgICAgICAgcGxheWVyLm9wcG9uZW50cy5zb3J0KChhLCBiKSA9PiBhID4gYiA/IDEgOiAtMSk7XHJcblxyXG4gICAgICAgIHJlc3VsdHNbZ3JpZFBsYWNlbWVudF0gPSBwbGF5ZXI7XHJcblxyXG4gICAgICAgIGxhc3RUb3VybmFtZW50UGxhY2VtZW50ID0gdG91cm5hbWVudFBsYWNlbWVudDtcclxuICAgICAgICBsYXN0R3JpZFBsYWNlbWVudCA9IGdyaWRQbGFjZW1lbnQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbmltcG9ydCB7IERFRkFVTFRfU0VUVElOR1MsIERPTV9BVFRSSUJVVEVTLCByZWFkVGFibGVTZXR0aW5nc0Zyb21ET00gfSBmcm9tICcuL3NldHRpbmdzJztcclxuaW1wb3J0IHBhcnNlIGZyb20gJy4vcGFyc2VyJztcclxuaW1wb3J0IGNvbnZlcnQgZnJvbSAnLi9yYXcydGFibGUnO1xyXG5pbXBvcnQgeyBhc0FycmF5LCBkZWZhdWx0cyB9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxuLyoqXHJcbiAqIEluZm9ybXMgaWYgdGhlIHdlYnNpdGUgaXMgcnVuIG9uIG1vYmlsZSBicm93c2VyLlxyXG4gKiBAdHlwZSB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGlzTW9iaWxlID0gL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgR29SZXN1bHRzSGlnaGxpZ2h0ZXIge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3JlYXRlcyBuZXcgaW5zdGFuY2Ugb2YgR29SZXN1bHRzSGlnaGxpZ2h0ZXJcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbGVtZW50IC0gbWFpbiBlbGVtZW50IGNvbnRhaW5pbmcgdGFibGUgd2l0aCByZXN1bHRzXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW3NldHRpbmdzXSAtIHBsdWdpbiBzZXR0aW5nc1xyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtzZXR0aW5ncy5jb2x1bW49MF0gLSBpbmRleCBvZiB0aGUgY29sdW1uXHJcbiAgICAgKiB3aGVyZSB0aGUgc2NyaXB0IHNob3VsZCBleHBlY3QgdG8gZmluZCBwbGF5ZXIncyBwbGFjZW1lbnRcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbc2V0dGluZ3Mucm93PTBdIC0gc3RhcnRpbmcgcm93IHdpdGggcGxheWVyc1xyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzZXR0aW5ncy5wcmVmaXhDbHM9J2dvLXJlc3VsdHMtJ10gLSBjc3MgY2xhc3MgcHJlZml4XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLmdhbWVDbHM9J2dhbWUnXSAtIGdhbWUgY2VsbCBjbGFzcyBuYW1lXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLmN1cnJlbnRDbHM9J2N1cnJlbnQnXSAtIHNlbGVjdGVkIHJvdyBjbGFzcyBuYW1lXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW3NldHRpbmdzLnJlc3VsdHNdIC0gbWFwIHdpdGggcG9zc2libGUgcmVzdWx0cywgYnkgZGVmYXVsdFxyXG4gICAgICogc3VwcG9ydHMgNCBvcHRpb25zLiBQcm92aWRlIHdpdGggXCJjbGFzc05hbWVcIiAtPiBcInJlZ2V4cFwiIHBhdHRlcm4uXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLnJlc3VsdHMud29uPScoWzAtOV0rKVxcXFwrJ10gLSBkZWZhdWx0IHdpbm5pbmcgcmVnZXhwXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLnJlc3VsdHMubG9zdD0nKFswLTldKylcXFxcLSddIC0gZGVmYXVsdCBsb3NpbmcgcmVnZXhwXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLnJlc3VsdHMuamlnbz0nKFswLTldKyk9J10gLSBkZWZhdWx0IGRyYXcgcmVnZXhwXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLnJlc3VsdHMudW5yZXNvbHZlZD0nKFswLTldKylcXFxcP10gLSBkZWZhdWx0IHVucmVzb2x2ZWQgcmVnZXhwXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLnJvd1RhZ3M9J3RyJ10gLSBxdWVyeVNlbGVjdGlvbi1jb21wYXRpYmxlIHN0cmluZ1xyXG4gICAgICogd2l0aCB0YWdzIHJlcHJlc2VudGluZyBwbGF5ZXJzJyByb3dzXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NldHRpbmdzLmNlbGxUYWdzPSd0ZCx0aCddIC0gcXVlcnlTZWxlY3Rpb24tY29tcGF0aWJsZVxyXG4gICAgICogc3RyaW5nIHdpdGggdGFncyBob2xkaW5nIGdhbWUgcmVzdWx0c1xyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihlbGVtZW50LCBzZXR0aW5ncykge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBkZWZhdWx0cyhERUZBVUxUX1NFVFRJTkdTLCByZWFkVGFibGVTZXR0aW5nc0Zyb21ET00oZWxlbWVudCksIHNldHRpbmdzKTtcclxuXHJcbiAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MUHJlRWxlbWVudCkge1xyXG4gICAgICAgICAgICBsZXQgdGFibGUgPSBjb252ZXJ0KGVsZW1lbnQuaW5uZXJIVE1MLCBzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgIGxldCBwYXJlbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XHJcblxyXG4gICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRhYmxlLCBlbGVtZW50KTtcclxuICAgICAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5lbGVtZW50ID0gdGFibGU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5lbGVtZW50LmNsYXNzTGlzdCkge1xyXG4gICAgICAgICAgICAvLyBub3Qgc3VwcG9ydGVkXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLmNyZWF0ZVBsYXllcnNNYXAoKTtcclxuICAgICAgICB0aGlzLmJpbmRFdmVudHMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQodGhpcy5zZXR0aW5ncy5wcmVmaXhDbHMgKyB0aGlzLnNldHRpbmdzLnRhYmxlQ2xzKTtcclxuICAgICAgICB0aGlzLnNob3dpbmdEZXRhaWxzID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGVzIHBsYXllcnMgbWFwXHJcbiAgICAgKi9cclxuICAgIGNyZWF0ZVBsYXllcnNNYXAoKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBwYXJzZSh0aGlzLmVsZW1lbnQsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIHRoaXMucGxheWVycyA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBwbGFjZW1lbnQgaW4gdGhpcy5tYXApIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubWFwLmhhc093blByb3BlcnR5KHBsYWNlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGxheWVycy5wdXNoKHRoaXMubWFwW3BsYWNlbWVudF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogTWFya3MgdGhlIHJvdyBmb3Igc2VsZWN0ZWQgcGxheWVyIGFuZCBhIGNlbGwgd2l0aCBvcHBvbmVudHMgZ2FtZSBpZlxyXG4gICAgICogcHJvdmlkZWQuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3BsYXllclBsYWNlXSAtIHBsYXllcidzIHBsYWNlLCBzZWxlY3Rpb24gd2lsbCBiZSByZW1vdmVcclxuICAgICAqIGlmIG5vdCBwbGF5ZXIgaXMgZm91bmQgZm9yIGdpdmVuIHBsYWNlXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wcG9uZW50UGxhY2VdIC0gcGxheWVyJ3Mgb3Bwb25lbnQncyBwbGFjZSAtIHRvIG1hcmtcclxuICAgICAqIGNlbGxzIHdpdGggZ2FtZSBiZXR3ZWVuIHBsYXllciBhbmQgdGhlIG9wcG9uZW50XHJcbiAgICAgKi9cclxuICAgIHNlbGVjdFBsYXllcihwbGF5ZXJQbGFjZSwgb3Bwb25lbnRQbGFjZSkge1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRDbHMgPSB0aGlzLnNldHRpbmdzLnByZWZpeENscyArIHRoaXMuc2V0dGluZ3MuY3VycmVudENscztcclxuICAgICAgICBjb25zdCBnYW1lQ2xzID0gdGhpcy5zZXR0aW5ncy5wcmVmaXhDbHMgKyB0aGlzLnNldHRpbmdzLmdhbWVDbHM7XHJcblxyXG4gICAgICAgIGNvbnN0IHBsYXllciA9IHRoaXMubWFwW3BsYXllclBsYWNlXTtcclxuXHJcbiAgICAgICAgY29uc3QgbWFya2VkR2FtZXMgPSBhc0FycmF5KHRoaXMuZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuJyArIGdhbWVDbHMpKTtcclxuICAgICAgICBjb25zdCBtYXJrZWRSb3cgPSB0aGlzLmVsZW1lbnQucXVlcnlTZWxlY3RvcignLicgKyBjdXJyZW50Q2xzKTtcclxuICAgICAgICBjb25zdCBtYXJrZWRSb3dQbGFjZW1lbnQgPSBtYXJrZWRSb3cgPyBtYXJrZWRSb3cuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLlBMQVlFUl9QTEFDRU1FTlQpIDogbnVsbDtcclxuICAgICAgICBjb25zdCBtYXJrZWRQbGF5ZXIgPSBtYXJrZWRSb3dQbGFjZW1lbnQgPyB0aGlzLm1hcFttYXJrZWRSb3dQbGFjZW1lbnRdIDogbnVsbDtcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIGFueSB2aXNpYmxlIGdhbWUgbWFya2luZ3NcclxuICAgICAgICBtYXJrZWRHYW1lcy5mb3JFYWNoKChnYW1lQ2VsbCkgPT4ge1xyXG4gICAgICAgICAgICBnYW1lQ2VsbC5jbGFzc0xpc3QucmVtb3ZlKGdhbWVDbHMpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyB1bm1hcmsgcGxheWVyIGlmIG5lY2Vzc2FyeVxyXG4gICAgICAgIGlmIChtYXJrZWRQbGF5ZXIgJiYgbWFya2VkUGxheWVyICE9PSBwbGF5ZXIpIHtcclxuICAgICAgICAgICAgbWFyay5jYWxsKHRoaXMsIG1hcmtlZFBsYXllciwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbWFyayB0aGUgcGxheWVyIGlmIG5vdCBhbHJlYWR5IG1hcmtlZFxyXG4gICAgICAgIGlmIChwbGF5ZXIgJiYgcGxheWVyICE9PSBtYXJrZWRQbGF5ZXIpIHtcclxuICAgICAgICAgICAgbWFyay5jYWxsKHRoaXMsIHBsYXllciwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBtYXJrIGFsbCB0aGUgZ2FtZXNcclxuICAgICAgICBpZiAodGhpcy5zaG93aW5nRGV0YWlscykge1xyXG4gICAgICAgICAgICBwbGF5ZXIub3Bwb25lbnRzLmZvckVhY2goKG9wcG9uZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1hcFtvcHBvbmVudF0uZ2FtZXNbcGxheWVyUGxhY2VdLmNlbGwuY2xhc3NMaXN0LmFkZChnYW1lQ2xzKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIG1hcmsgdGhlIGdhbWUgYmV0d2VlbiB0aGUgcGxheWVyIGFuZCB0aGUgb3Bwb25lbnRcclxuICAgICAgICB9IGVsc2UgaWYgKHBsYXllciAmJiBvcHBvbmVudFBsYWNlKSB7XHJcbiAgICAgICAgICAgIHBsYXllci5nYW1lc1tvcHBvbmVudFBsYWNlXS5jZWxsLmNsYXNzTGlzdC5hZGQoZ2FtZUNscyk7XHJcbiAgICAgICAgICAgIHRoaXMubWFwW29wcG9uZW50UGxhY2VdLmdhbWVzW3BsYXllclBsYWNlXS5jZWxsLmNsYXNzTGlzdC5hZGQoZ2FtZUNscyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBtYXJrKHBsYXllciwgYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZCA9IGFjdGl2ZSA/ICdhZGQnIDogJ3JlbW92ZSc7XHJcblxyXG4gICAgICAgICAgICBwbGF5ZXIucm93LmNsYXNzTGlzdFttZXRob2RdKGN1cnJlbnRDbHMpO1xyXG5cclxuICAgICAgICAgICAgcGxheWVyLm9wcG9uZW50cy5mb3JFYWNoKChvcHBvbmVudFBsYWNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb3Bwb25lbnQgPSB0aGlzLm1hcFtvcHBvbmVudFBsYWNlXTtcclxuXHJcbiAgICAgICAgICAgICAgICBvcHBvbmVudC5yb3cuY2xhc3NMaXN0W21ldGhvZF0odGhpcy5zZXR0aW5ncy5wcmVmaXhDbHMgKyBwbGF5ZXIuZ2FtZXNbb3Bwb25lbnRQbGFjZV0uY2xzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVzdG9yZXMgcHJvcGVyIG9yZGVyIG9mIHJlc3VsdHNcclxuICAgICAqL1xyXG4gICAgcmVzdG9yZUZ1bGxSZXN1bHRzKCkge1xyXG4gICAgICAgIHRoaXMucGxheWVyc1xyXG4gICAgICAgICAgICAuZmlsdGVyKChwbGF5ZXIpID0+IHBsYXllci5yb3cucHJvcGVyTmV4dFNpYmxpbmcpXHJcbiAgICAgICAgICAgIC5yZXZlcnNlKClcclxuICAgICAgICAgICAgLmZvckVhY2goKHBsYXllcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcGxheWVyLnJvdy5wYXJlbnROb2RlLmluc2VydEJlZm9yZShwbGF5ZXIucm93LCBwbGF5ZXIucm93LnByb3Blck5leHRTaWJsaW5nKTtcclxuICAgICAgICAgICAgICAgIHBsYXllci5yb3cucHJvcGVyTmV4dFNpYmxpbmcgPSBudWxsO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUodGhpcy5zZXR0aW5ncy5wcmVmaXhDbHMgKyB0aGlzLnNldHRpbmdzLnNob3dpbmdEZXRhaWxzQ2xzKTtcclxuICAgICAgICB0aGlzLnNob3dpbmdEZXRhaWxzID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBTaG93cyBkZXRhaWxzIGZvciBzZWxlY3RlZCBwbGF5ZXJcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcGxheWVyUGxhY2VdXHJcbiAgICAgKi9cclxuICAgIHNob3dEZXRhaWxzKHBsYXllclBsYWNlKSB7XHJcbiAgICAgICAgY29uc3QgcGxheWVyID0gdGhpcy5tYXBbcGxheWVyUGxhY2VdO1xyXG5cclxuICAgICAgICBpZiAoIXBsYXllcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwYXJlbnQgPSBwbGF5ZXIucm93LnBhcmVudE5vZGU7XHJcbiAgICAgICAgbGV0IGFmdGVyID0gcGxheWVyLnJvdy5uZXh0U2libGluZztcclxuXHJcbiAgICAgICAgcGxheWVyLm9wcG9uZW50cy5mb3JFYWNoKChvcHBvbmVudFBsYWNlKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBvcHBvbmVudCA9IHRoaXMubWFwW29wcG9uZW50UGxhY2VdO1xyXG5cclxuICAgICAgICAgICAgb3Bwb25lbnQucm93LnByb3Blck5leHRTaWJsaW5nID0gb3Bwb25lbnQucm93Lm5leHRTaWJsaW5nO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wcG9uZW50UGxhY2UgPCBwbGF5ZXJQbGFjZSkge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShvcHBvbmVudC5yb3csIHBsYXllci5yb3cpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZShvcHBvbmVudC5yb3csIGFmdGVyKTtcclxuICAgICAgICAgICAgICAgIGFmdGVyID0gb3Bwb25lbnQucm93Lm5leHRTaWJsaW5nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIHVuZm9ydHVuYXRlbHkgYXBwbHlpbmcgY2xhc3NlcyBvbiBsb25nIHRhYmxlcyBpcyB2ZXJ5IGV4cGVuc2l2ZVxyXG4gICAgICAgIC8vIG9wZXJhdGlvbiBjYXVzaW5nIGxhZ3MuIEluIG9yZGVyIHRvIHByb3ZpZGUgYmV0dGVyIHBlcmZvcm1hbmNlXHJcbiAgICAgICAgLy8gZmVlbGluZyBhIGNsYXNzIGlzIG5vdCBhZGRlZCB3aGVuIHRoZSB0YWJsZSBleGNlZWRzIDEwMCByb3dzLlxyXG4gICAgICAgIGlmICghaXNNb2JpbGUgfHwgdGhpcy5wbGF5ZXJzLmxlbmd0aCA8IDEwMCkge1xyXG4gICAgICAgICAgICB0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZCh0aGlzLnNldHRpbmdzLnByZWZpeENscyArIHRoaXMuc2V0dGluZ3Muc2hvd2luZ0RldGFpbHNDbHMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5zaG93aW5nRGV0YWlscyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RQbGF5ZXIocGxheWVyUGxhY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQmluZHMgbW91c2VvdmVyIGFuZCBtb3VzZW91dCBldmVudHMgbGlzdGVuZXJzIHRvIHRoZSBlbGVtZW50LlxyXG4gICAgICovXHJcbiAgICBiaW5kRXZlbnRzKCkge1xyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5jbGlja2luZyA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuc2hvd2luZ0RldGFpbHMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZUZ1bGxSZXN1bHRzKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSBldmVudC50YXJnZXQ7XHJcbiAgICAgICAgICAgIGxldCBwbGF5ZXJQbGFjZW1lbnQgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgLy8gZmV0Y2ggaW5mb3JtYXRpb24gYWJvdXQgaG92ZXJlZCBlbGVtZW50XHJcbiAgICAgICAgICAgIHdoaWxlICh0YXJnZXQgJiYgdGFyZ2V0ICE9PSBkb2N1bWVudCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBsYWNlbWVudCA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoRE9NX0FUVFJJQlVURVMuUExBWUVSX1BMQUNFTUVOVCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcGxheWVyIHJvdz8gbm8gZnVydGhlciBzZWFyY2ggaXMgbmVjZXNzYXJ5XHJcbiAgICAgICAgICAgICAgICBpZiAocGxhY2VtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyUGxhY2VtZW50ID0gcGxhY2VtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXBsYXllclBsYWNlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNob3dEZXRhaWxzKHBsYXllclBsYWNlbWVudCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW92ZXInLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaG92ZXJpbmcgPT09IGZhbHNlIHx8IHRoaXMuc2hvd2luZ0RldGFpbHMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IGV2ZW50LnRhcmdldDtcclxuICAgICAgICAgICAgbGV0IG9wcG9uZW50ID0gbnVsbDtcclxuICAgICAgICAgICAgbGV0IHBsYXllciA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAvLyBmZXRjaCBpbmZvcm1hdGlvbiBhYm91dCBob3ZlcmVkIGVsZW1lbnRcclxuICAgICAgICAgICAgd2hpbGUgKHRhcmdldCAmJiB0YXJnZXQgIT09IGRvY3VtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb3Bwb25lbnRHcmlkUGxhY2VtZW50ID0gdGFyZ2V0LmdldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5PUFBPTkVOVF9QTEFDRU1FTlQpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHBsYXllckdyaWRQbGFjZW1lbnQgPSB0YXJnZXQuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLlBMQVlFUl9QTEFDRU1FTlQpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGdhbWUgY2VsbD9cclxuICAgICAgICAgICAgICAgIGlmIChvcHBvbmVudEdyaWRQbGFjZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICBvcHBvbmVudCA9IG9wcG9uZW50R3JpZFBsYWNlbWVudDtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBwbGF5ZXIgcm93PyBubyBmdXJ0aGVyIHNlYXJjaCBpcyBuZWNlc3NhcnlcclxuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXJHcmlkUGxhY2VtZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyID0gcGxheWVyR3JpZFBsYWNlbWVudDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFwbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RQbGF5ZXIocGxheWVyLCBvcHBvbmVudCk7XHJcbiAgICAgICAgfSwgZmFsc2UpO1xyXG5cclxuICAgICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCAoZXZlbnQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaG92ZXJpbmcgPT09IGZhbHNlIHx8IHRoaXMuc2hvd2luZ0RldGFpbHMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IGV2ZW50LnJlbGF0ZWRUYXJnZXQ7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGFyZ2V0ICYmIHRhcmdldCAhPT0gZG9jdW1lbnQgJiYgdGFyZ2V0ICE9PSB0aGlzLmVsZW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBpZiBuZXcgaG92ZXJlZCBlbGVtZW50IGlzIG91dHNpZGUgdGhlIHRhYmxlIHRoZW4gcmVtb3ZlIGFsbFxyXG4gICAgICAgICAgICAvLyBzZWxlY3Rpb25zXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHRoaXMuZWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RQbGF5ZXIoLTEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcblxyXG5Hb1Jlc3VsdHNIaWdobGlnaHRlci5ERUZBVUxUX1NFVFRJTkdTID0gREVGQVVMVF9TRVRUSU5HUzsiLCIndXNlIHN0cmljdCc7XHJcblxyXG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBET01fQVRUUklCVVRFUywgdG9SZXN1bHRzV2l0aFJlZ0V4cCB9IGZyb20gJy4vc2V0dGluZ3MnO1xyXG5pbXBvcnQgeyBkZWZhdWx0cyB9IGZyb20gJy4vdXRpbHMnO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHJhdyByZXN1bHRzIHN0cmluZyBpbnRvIHRhYmxlIHdpdGggcm93cyBhbmQgY2VsbHMuXHJcbiAqIFJldHVybnMgbnVsbCBpZiBub3QgdmFsaWQgaW5wdXQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSByYXdSZXN1bHRzXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlnXVxyXG4gKiBAcGFyYW0ge251bWJlcn0gW2NvbmZpZy5zdGFydGluZ1Jvd10gLSBpbmZvcm1zIHdoZXJlIGlzIHRoZSBmaXJzdCByb3cgd2l0aCByZXN1bHRzXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBbY29uZmlnLnBsYWNlQ29sdW1uXSAtIGluZm9ybXMgaW4gd2hpY2ggY29sdW1uIGlzIHRoZSBwbGFjZSBsb2NhdGVkXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29uZmlnLnJvdW5kc0NvbHVtbnNdIC0gY29tbWEgc2VwYXJhdGVkIGxpc3Qgb2YgY29sdW1ucyB3aGVyZSBnYW1lIHJlc3VsdHMgYXJlIGxvY2F0ZWRcclxuICogQHBhcmFtIHtzdHJpbmd9IFtjb25maWcuY2VsbFNlcGFyYXRvcj0nXFx0J10gLSBzZXBhcmF0ZWQgdXNlZCB0byBkaXZpZGUgcm93cyBpbnRvIGNlbGxzXHJcbiAqIEByZXR1cm5zIHtIVE1MRWxlbWVudHxudWxsfVxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udmVydFJhd1Jlc3VsdHNUb1RhYmxlKHJhd1Jlc3VsdHMsIGNvbmZpZykge1xyXG4gICAgaWYgKCFyYXdSZXN1bHRzKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2V0dGluZ3MgPSBkZWZhdWx0cyhERUZBVUxUX1NFVFRJTkdTLCBjb25maWcpO1xyXG4gICAgY29uc3QgbGluZXMgPSByYXdSZXN1bHRzLnNwbGl0KC9cXHJcXG58XFxuLyk7XHJcblxyXG4gICAgaWYgKGxpbmVzLmxlbmd0aCA8PTIgJiYgIWxpbmVzWzBdICYmICFsaW5lc1sxXSkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3VsdHNNYXAgPSB0b1Jlc3VsdHNXaXRoUmVnRXhwKHNldHRpbmdzLnJlc3VsdHMpO1xyXG4gICAgY29uc3QgcmVzdWx0c01hcENvdW50ID0gcmVzdWx0c01hcC5sZW5ndGg7XHJcbiAgICBjb25zdCBvdXRwdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0YWJsZScpO1xyXG4gICAgY29uc3Qgcm93cyA9IGxpbmVzLm1hcCgobGluZSkgPT4gbGluZS5zcGxpdChzZXR0aW5ncy5yb3dTZXBhcmF0b3IpKTtcclxuICAgIGNvbnN0IHRhYmxlV2lkdGggPSByb3dzLnJlZHVjZSgocHJldiwgbGluZSkgPT4gTWF0aC5tYXgocHJldiwgbGluZS5sZW5ndGgpLCAwKTtcclxuXHJcbiAgICBsZXQgZ2FtZXNJbkNvbHVtbnMgPSBudWxsO1xyXG5cclxuICAgIC8vIGlmIGNvbHVtbnMgcm91bmRzIGFyZSBwcm92aWRlZCB0aGVuIGNvbnZlcnQgb25seSB0aGVtXHJcbiAgICBpZiAodHlwZW9mIHNldHRpbmdzLnJvdW5kc0NvbHVtbnMgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgZ2FtZXNJbkNvbHVtbnMgPSBzZXR0aW5ncy5yb3VuZHNDb2x1bW5zLnNwbGl0KCcsJykubWFwKE51bWJlcik7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHByZXZpb3VzUGxhY2U7XHJcblxyXG4gICAgcm93cy5mb3JFYWNoKChjZWxscywgaW5kZXgpID0+IHtcclxuICAgICAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xyXG4gICAgICAgIGNvbnN0IHdpZHRoID0gY2VsbHMubGVuZ3RoO1xyXG5cclxuICAgICAgICBpZiAoIXdpZHRoKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh3aWR0aCA8IHRhYmxlV2lkdGgpIHtcclxuICAgICAgICAgICAgaWYgKGNlbGxzLmxlbmd0aCA9PT0gMSAmJiAhY2VsbHNbMF0gfHwgY2VsbHNbMF1bMF0gPT09ICc7Jykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgY2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XHJcblxyXG4gICAgICAgICAgICBjZWxsLnNldEF0dHJpYnV0ZSgnY29sc3BhbicsIHRhYmxlV2lkdGgpO1xyXG4gICAgICAgICAgICBjZWxsLnRleHRDb250ZW50ID0gY2VsbHMuam9pbignICcpO1xyXG5cclxuICAgICAgICAgICAgcm93LnNldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5QTEFZRVJfUExBQ0VNRU5ULCAtMSk7XHJcbiAgICAgICAgICAgIHJvdy5hcHBlbmRDaGlsZChjZWxsKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHBsYWNlID0gcGFyc2VJbnQoY2VsbHNbc2V0dGluZ3MucGxhY2VDb2x1bW5dLCAxMCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaW5kZXggPCBzZXR0aW5ncy5zdGFydGluZ1JvdyB8fCAoaXNOYU4ocGxhY2UpICYmICFwcmV2aW91c1BsYWNlKSkge1xyXG4gICAgICAgICAgICAgICAgY2VsbHMuZm9yRWFjaCgoY2VsbENvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgY2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNlbGwudGV4dENvbnRlbnQgPSBjZWxsQ29udGVudDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcm93LnNldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5QTEFZRVJfUExBQ0VNRU5ULCAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKGNlbGwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcm93LnNldEF0dHJpYnV0ZShET01fQVRUUklCVVRFUy5QTEFZRVJfUExBQ0VNRU5ULCBwcmV2aW91c1BsYWNlIHx8IHBsYWNlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgb3Bwb25lbnRzID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgY2VsbHMuZm9yRWFjaCgoY2VsbENvbnRlbnQsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjZWxsLnRleHRDb250ZW50ID0gY2VsbENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZ2FtZXNJbkNvbHVtbnMgfHwgZ2FtZXNJbkNvbHVtbnMuaW5kZXhPZihpbmRleCkgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlc3VsdHNNYXBDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWF0Y2ggPSBjZWxsQ29udGVudC5tYXRjaChyZXN1bHRzTWFwW2ldLnJlZ2V4cCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFtYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvcHBvbmVudFBsYWNlbWVudCA9IG1hdGNoWzFdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wcG9uZW50cy5wdXNoKG9wcG9uZW50UGxhY2VtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGwuc2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLk9QUE9ORU5UX1BMQUNFTUVOVCwgb3Bwb25lbnRQbGFjZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbC5zZXRBdHRyaWJ1dGUoRE9NX0FUVFJJQlVURVMuR0FNRV9SRVNVTFQsIHJlc3VsdHNNYXBbaV0uY2xzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKGNlbGwpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG9wcG9uZW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICByb3cuc2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLk9QUE9ORU5UUywgb3Bwb25lbnRzLmpvaW4oJywnKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFwcmV2aW91c1BsYWNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNQbGFjZSA9IDI7XHJcbiAgICAgICAgICAgICAgICB9ICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c1BsYWNlICs9IDE7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBvdXRwdXQuYXBwZW5kQ2hpbGQocm93KTtcclxuICAgIH0pO1xyXG5cclxuICAgIG91dHB1dC5zZXRBdHRyaWJ1dGUoRE9NX0FUVFJJQlVURVMuUkVTVUxUX1RBQkxFLCAnJyk7XHJcblxyXG4gICAgcmV0dXJuIG91dHB1dDtcclxufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHNldHRpbmdzIG9mIHRoZSBwbHVnaW5cclxuICogQHR5cGUge3twcmVmaXhDbHM6IHN0cmluZywgc2hvd2luZ0RldGFpbHNDbHM6IHN0cmluZywgdGFibGVDbHM6IHN0cmluZywgZ2FtZUNsczogc3RyaW5nLCBjdXJyZW50Q2xzOiBzdHJpbmcsIHJlc3VsdHM6IHt3b246IHN0cmluZywgbG9zdDogc3RyaW5nLCBqaWdvOiBzdHJpbmcsIHVucmVzb2x2ZWQ6IHN0cmluZ30sIHN0YXJ0aW5nUm93OiBudW1iZXIsIHBsYWNlQ29sdW1uOiBudW1iZXIsIHJvdW5kc0NvbHVtbnM6IG51bGwsIHJvd1RhZ3M6IHN0cmluZywgY2VsbFRhZ3M6IHN0cmluZywgcm93U2VwYXJhdG9yOiBzdHJpbmcsIGhvdmVyaW5nOiBib29sZWFuLCBjbGlja2luZzogYm9vbGVhbn19XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUyA9IHtcclxuICAgIHByZWZpeENsczogJ2dvLXJlc3VsdHMtJyxcclxuICAgIHNob3dpbmdEZXRhaWxzQ2xzOidzaG93aW5nLWRldGFpbHMnLFxyXG4gICAgdGFibGVDbHM6ICd0YWJsZScsXHJcbiAgICBnYW1lQ2xzOiAnZ2FtZScsXHJcbiAgICBjdXJyZW50Q2xzOiAnY3VycmVudCcsXHJcblxyXG4gICAgcmVzdWx0czoge1xyXG4gICAgICAgIHdvbjogJyhbMC05XSspXFxcXCsnLFxyXG4gICAgICAgIGxvc3Q6ICcoWzAtOV0rKVxcXFwtJyxcclxuICAgICAgICBqaWdvOiAnKFswLTldKyk9JyxcclxuICAgICAgICB1bnJlc29sdmVkOiAnKFswLTldKylcXFxcPydcclxuICAgIH0sXHJcblxyXG4gICAgc3RhcnRpbmdSb3c6IDAsXHJcbiAgICBwbGFjZUNvbHVtbjogMCxcclxuICAgIHJvdW5kc0NvbHVtbnM6IG51bGwsXHJcblxyXG4gICAgcm93VGFnczogJ3RyJyxcclxuICAgIGNlbGxUYWdzOiAndGQsdGgnLFxyXG4gICAgcm93U2VwYXJhdG9yOiAnXFx0JyxcclxuXHJcbiAgICBob3ZlcmluZzogdHJ1ZSxcclxuICAgIGNsaWNraW5nOiB0cnVlXHJcbn07XHJcblxyXG4vKipcclxuICogTmFtZXMgb2YgYXR0cmlidXRlcyB1c2VkIGluIHRoaXMgcGx1Z2luXHJcbiAqIEB0eXBlIHt7UkVTVUxUX1RBQkxFOiBzdHJpbmcsIFNFVFRJTkdfU1RBUlRJTkdfUk9XOiBzdHJpbmcsIFNFVFRJTkdfUExBQ0VfQ09MVU1OOiBzdHJpbmcsIFNFVFRJTkdfUk9VTkRTX0NPTFVNTlM6IHN0cmluZywgUExBWUVSX1BMQUNFTUVOVDogc3RyaW5nLCBPUFBPTkVOVF9QTEFDRU1FTlQ6IHN0cmluZywgR0FNRV9SRVNVTFQ6IHN0cmluZ319XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgRE9NX0FUVFJJQlVURVMgPSB7XHJcbiAgICBSRVNVTFRfVEFCTEU6ICdkYXRhLWdvLXJlc3VsdHMnLFxyXG4gICAgU0VUVElOR19TVEFSVElOR19ST1c6ICdkYXRhLWdvLXN0YXJ0aW5nLXJvdycsXHJcbiAgICBTRVRUSU5HX1BMQUNFX0NPTFVNTjogJ2RhdGEtZ28tcGxhY2UtY29sJyxcclxuICAgIFNFVFRJTkdfUk9VTkRTX0NPTFVNTlM6ICdkYXRhLWdvLXJvdW5kcy1jb2xzJyxcclxuICAgIFBMQVlFUl9QTEFDRU1FTlQ6ICdkYXRhLWdvLXBsYWNlJyxcclxuICAgIE9QUE9ORU5UX1BMQUNFTUVOVDogJ2RhdGEtZ28tb3Bwb25lbnQnLFxyXG4gICAgT1BQT05FTlRTOiAnZGF0YS1nby1vcHBvbmVudHMnLFxyXG4gICAgR0FNRV9SRVNVTFQ6ICdkYXRhLWdvLXJlc3VsdCdcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUcmFuc2Zvcm1zIG1hcCBvZiBwb3NzaWJsZSByZXN1bHRzIGludG8gYXJyYXkgb2Ygb2JqZWN0cyB3aXRoIHJlZ2V4cCBzdHJpbmdcclxuICogY29udmVydGVkIGludG8gUmVnRXhwIG9iamVjdHMuXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSByZXN1bHRzXHJcbiAqIEByZXR1cm5zIHtBcnJheS48e2Nsczogc3RyaW5nLCByZWdleHA6IFJlZ0V4cH0+fVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRvUmVzdWx0c1dpdGhSZWdFeHAocmVzdWx0cykge1xyXG4gICAgY29uc3QgbWFwID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgY2xzIGluIHJlc3VsdHMpIHtcclxuICAgICAgICBpZiAocmVzdWx0cy5oYXNPd25Qcm9wZXJ0eShjbHMpKSB7XHJcbiAgICAgICAgICAgIG1hcC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIGNscyxcclxuICAgICAgICAgICAgICAgIHJlZ2V4cDogbmV3IFJlZ0V4cChyZXN1bHRzW2Nsc10pXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbWFwO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2tzIHRoZSBlbGVtZW50IGZvciAzIGF0dHJpYnV0ZXMgYW5kIHJldHVybnMgb2JqZWN0IHdpdGggc2V0IGFwcHJvcHJpYXRlXHJcbiAqIHZhbHVlc1xyXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSB0YWJsZVxyXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRUYWJsZVNldHRpbmdzRnJvbURPTSh0YWJsZSkge1xyXG4gICAgY29uc3Qgb3V0cHV0ID0ge307XHJcblxyXG4gICAgaWYgKHRhYmxlLmhhc0F0dHJpYnV0ZShET01fQVRUUklCVVRFUy5TRVRUSU5HX1BMQUNFX0NPTFVNTikpIHtcclxuICAgICAgICBvdXRwdXQucGxhY2VDb2x1bW4gPSBOdW1iZXIodGFibGUuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLlNFVFRJTkdfUExBQ0VfQ09MVU1OKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRhYmxlLmhhc0F0dHJpYnV0ZShET01fQVRUUklCVVRFUy5TRVRUSU5HX1NUQVJUSU5HX1JPVykpIHtcclxuICAgICAgICBvdXRwdXQuc3RhcnRpbmdSb3cgPSBOdW1iZXIodGFibGUuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLlNFVFRJTkdfU1RBUlRJTkdfUk9XKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRhYmxlLmhhc0F0dHJpYnV0ZShET01fQVRUUklCVVRFUy5TRVRUSU5HX1JPVU5EU19DT0xVTU5TKSkge1xyXG4gICAgICAgIG91dHB1dC5yb3VuZHNDb2x1bW5zID0gdGFibGUuZ2V0QXR0cmlidXRlKERPTV9BVFRSSUJVVEVTLlNFVFRJTkdfUk9VTkRTX0NPTFVNTlMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBvdXRwdXQ7XHJcbn0iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogVHJhbnNmb3JtcyBhcnJheS1saWtlIG9iamVjdHMgKHN1Y2ggYXMgYXJndW1lbnRzIG9yIG5vZGUgbGlzdHMpIGludG8gYW4gYXJyYXlcclxuICogQHBhcmFtIHsqfSBhcnJheUxpa2VcclxuICogQHJldHVybnMge0FycmF5LjxUPn1cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhc0FycmF5KGFycmF5TGlrZSkge1xyXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFycmF5TGlrZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIG5ldyBvYmplY3QgY29udGFpbmluZyBrZXlzIG9ubHkgZnJvbSBkZWZhdWx0T2JqIGJ1dCB2YWx1ZXMgYXJlIHRha2VuXHJcbiAqIGZyb20gaWYgZXhpc3QgKHN0YXJ0aW5nIGZyb20gdGhlIGxhc3Qgb2JqZWN0IHByb3ZpZGVkKVxyXG4gKiBAcGFyYW0ge29iamVjdH0gZGVmYXVsdE9ialxyXG4gKiBAcGFyYW0ge0FycmF5LjxvYmplY3Q+fSBvYmplY3RzXHJcbiAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdHMoZGVmYXVsdE9iaiwgLi4ub2JqZWN0cykge1xyXG4gICAgY29uc3Qgb3ZlcnJpZGVzID0gb2JqZWN0c1xyXG4gICAgICAgIC5maWx0ZXIoKG9iaikgPT4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpXHJcbiAgICAgICAgLnJldmVyc2UoKTtcclxuXHJcbiAgICBjb25zdCBjb3VudCA9IG92ZXJyaWRlcy5sZW5ndGg7XHJcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcclxuXHJcbiAgICBtYWluTG9vcDogZm9yIChsZXQga2V5IGluIGRlZmF1bHRPYmopIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKG92ZXJyaWRlc1tpXS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IG92ZXJyaWRlc1tpXVtrZXldO1xyXG4gICAgICAgICAgICAgICAgY29udGludWUgbWFpbkxvb3A7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlc3VsdFtrZXldID0gZGVmYXVsdE9ialtrZXldO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIG5ldyBvYmplY3QgdGhhdCBoYXMgbWVyZ2VkIHByb3BlcnRpZXMgZnJvbSBhbGwgcHJvdmlkZWQgb2JqZWN0cy5cclxuICogTGF0ZXN0IGFyZ3VtZW50cyBvdmVycmlkZXMgdGhlIGVhcmxpZXIgdmFsdWVzLlxyXG4gKiBAcGFyYW0ge0FycmF5LjxvYmplY3Q+fSBvYmplY3RzXHJcbiAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29tYmluZSguLi5vYmplY3RzKSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSB7fTtcclxuXHJcbiAgICBvYmplY3RzLmZvckVhY2goKG9iamVjdCkgPT4ge1xyXG4gICAgICAgIGZvciAobGV0IGtleSBpbiBvYmplY3QpIHtcclxuICAgICAgICAgICAgaWYgKG9iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IG9iamVjdFtrZXldO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufSJdfQ==
(1)
});
