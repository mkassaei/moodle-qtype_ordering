// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Generic library to allow things in a vertical list to be re-ordered using drag and drop.
 *
 * To make a set of things draggable, create a new instance of this object passing the
 * necessary config, as explained in the comment on the constructor.
 *
 * @package qtype_ordering
 * @copyright 2018 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @module qtype_ordering/drag_reorder
 */
define(['jquery', 'core/modal_factory', 'core/modal_events', 'core/dragdrop', 'core/key_codes'], function($, ModalFactory, ModalEvents, drag, keys) {

    /**
     * Constructor.
     *
     * To make a list draggable, create a new instance of this object, passing the necessary config.
     * For example:
     * {
     *      // Selector for the list (or lists) to be reordered.
     *      list: 'ul.my-list',
     *
     *      // Selector, relative to the list selector, for the items that can be moved.
     *      item: '> li',
     *
     *      // Selector, relative to the list item selector (not the item) for where you can click to start moving.
     *      handle: 'a.drag-handle, > li label',
     *
     *      // The user actually drags a proxy object, which is constructed from this string,
     *      // and then added directly as a child of <body>. The token %%ITEM_HTML%% is
     *      // replaced with the innerHtml of the item being dragged. The token %%ITEM_CLASS_NAME%%
      *     // is replaced with the class attribute of the item being dragged. Because of this,
     *      // the styling of the contents of your list item needs to work for the proxy, as well as
     *      // for items in place in the context of the list. Your CSS also needs to ensure
     *      // that this proxy has position: absolute. You probably want other styles, like a
     *      // drop shadow. Using class osep-itemmoving might be all you need to do.
     *      proxyHtml: '<div class="osep-itemmoving %%ITEM_CLASS_NAME%%">%%ITEM_HTML%%</div>,
     *
     *      // While the proxy is being dragged, this class is added to the item being moved.
     *      // You can probably use "osep-itemmoving" here.
     *      itemMovingClass: "osep-itemmoving",
     *
     *      // This is a callback which, when called with the DOM node for an item,
     *      // returns the string that uniquely identifies each item.
     *      // Therefore, the result of the drag action will be represented by the array
     *      // obtained by calling this method on each item in the list in order.
     *      idGetter: function(item) { return $(node).data('id'); },
     *
     *      // This is a callback which, when called with the DOM node for an item,
     *      // returns a string that is the name of the item.
     *      nameGetter: function(item) { return $(node).text(); },
     *
     *      // Function that will be called when a re-order starts (optional, can be not set).
     *      // Useful if you need to save information about the initial state.
     *      // This function should have two parameters. The first will be a
     *      // jQuery object for the list that was reordered, the second will
     *      // be the jQuery object for the item moved - which will not yet have been moved.
     *      // Note, it is quite possible for reorderStart to be called with no
     *      // subsequent call to reorderDone.
     *      reorderStart: function($list, $item) { ... }
     *
     *      // Function that will be called when a drag has finished, and the list
     *      // has been reordered. This function should have three parameters. The first will be
     *      // a jQuery object for the list that was reordered, the second will be the jQuery
     *      // object for the item moved, and the third will be the new order, which is
     *      // an array of ids obtained by calling idGetter on each item in the list in order.
     *      // This callback will only be called in the new order is actually different from the old order.
     *      reorderDone: function($list, $item, newOrder) { ... }
     *
     *      // Function that is alwasy called when a re-order ends (optional, can be not set)
     *      // whether or not the order has changed. Useful if you need to undo changes made
     *      // in reorderStart, since reorderDone is only called if the new order is different
     *      // from the original order.
     *      reorderEnd: function($list, $item) { ... }
     *  }
     *
     * There is a subtlety ( === hack?) that you can use. If you have items in your list that do not
     * have a drag handle, they they are considered to be placeholders in otherwise empty containers.
     * See how block_userlinks does it, if this seems like it might be useful. nameGetter should return
     * the container name for these items.
     *
     * @param config As above.
     */
    return function(config) {
        var dragStart = null,       // Information about when and where the drag started.
            originalOrder = null,   // Array of ids.
            itemDragging = null,    // Item being moved by dragging (jQuery object).
            itemMoving = null,      // Item being moved using the accessible modal (jQuery object).
            proxy = null,           // Drag proxy (jQuery object).
            accessibleModal = null; // The accessible move modal (Modal).

        var startDrag = function(event, details) {
            dragStart = {
                time: new Date().getTime(),
                x: details.x,
                y: details.y
            };

            itemDragging = $(event.currentTarget).closest(config.itemInPage);

            if (typeof config.reorderStart !== 'undefined') {
                config.reorderStart(itemDragging.closest(config.list), itemDragging);
            }

            originalOrder = getCurrentOrder();
            proxy = $(config.proxyHtml.replace('%%ITEM_HTML%%', itemDragging.html())
                .replace('%%ITEM_CLASS_NAME%%', itemDragging.attr('class'))
                .replace('%%ITEM_ID_NAME%%', itemDragging.attr('id')));

            $(document.body).append(proxy);
            proxy.css('position', 'absolute');
            proxy.css(itemDragging.offset());
            proxy.width(itemDragging.outerWidth());
            proxy.height(itemDragging.outerHeight());
            itemDragging.addClass(config.itemMovingClass);

            // Start drag.
            drag.start(event, proxy, dragMove, dragEnd);
        };

        var dragMove = function() {
            var list = itemDragging.closest(config.list);
            var closestItem = null;
            var closestDistance = null;
            list.find(config.item).each(function (index, element) {
                var distance = distanceBetweenElements(element, proxy);
                if (closestItem === null || distance < closestDistance) {
                    closestItem = $(element);
                    closestDistance = distance;
                }
            });

            if (closestItem[0] === itemDragging[0]) {
                return;
            }

            if (midY(proxy) < midY(closestItem)) {
                itemDragging.insertBefore(closestItem);
            } else {
                itemDragging.insertAfter(closestItem);
            }
        };

        /**
         * It outer and inner are two CSS selectors, which may contain commas,
         * then combine them safely. So combineSelectors('a, b', 'c, d')
         * gives 'a c, a d, b c, b d'.
         * @param outer
         * @param inner
         * @returns {string}
         */
        var combineSelectors = function(outer, inner) {
            var combined = [];
            outer.split(',').forEach(function(firstSelector) {
                inner.split(',').forEach(function(secondSelector) {
                    combined.push(firstSelector.trim() + ' ' + secondSelector.trim());
                });
            });
            return combined.join(', ');
        };

        var dragEnd = function(x, y) {
            if (typeof config.reorderEnd !== 'undefined') {
                config.reorderEnd(itemDragging.closest(config.list), itemDragging);
            }

            var newOrder = getCurrentOrder();
            if (!arrayEquals(originalOrder, newOrder)) {
                // Order has changed, call the callback.
                config.reorderDone(itemDragging.closest(config.list), itemDragging, newOrder);

            } else if (new Date().getTime() - dragStart.time < 500 &&
                Math.abs(dragStart.x - x) < 10 && Math.abs(dragStart.y - y) < 10) {
                // This was really a click. Set the focus on the current item.
                itemDragging[0].focus();
            }
            proxy.remove();
            proxy = null;
            itemDragging.removeClass(config.itemMovingClass);
            itemDragging = null;
            dragStart = null;
        };

        /**
         * Get the x-position of the middle of the DOM node represented by the given jQuery object.
         * @param jQuery wrapping a DOM node.
         * @returns Number the x-coordinate of the middle (left plus half outerWidth).
         */
        var midX = function(jQuery) {
            return jQuery.offset().left + jQuery.outerWidth() / 2;
        };

        /**
         * Get the y-position of the middle of the DOM node represented by the given jQuery object.
         * @param jQuery wrapping a DOM node.
         * @returns Number the y-coordinate of the middle (top plus half outerHeight).
         */
        var midY = function(jQuery) {
            return jQuery.offset().top + jQuery.outerHeight() / 2;
        };

        /**
         * Calculate the distance between the centres of two elements.
         * @param element1 selector, element or jQuery.
         * @param element2 selector, element or jQuery.
         * @return number the distance in pixels.
         */
        var distanceBetweenElements = function(element1, element2) {
            var e1 = $(element1), e2 = $(element2);
            var dx = midX(e1) - midX(e2);
            var dy = midY(e1) - midY(e2);
            return Math.sqrt(dx * dx + dy * dy);
        };

        /**
         * Get the current order of the list containing itemDragging.
         * @returns Array of strings, the id of each element in order.
         */
        var getCurrentOrder = function() {
            return (itemDragging || itemMoving).closest(config.list).find(config.item).map(
                    function(index, item) { return config.idGetter(item); }).get();
        };

        /**
         * Find the item with a given id.
         * @param targetId string the id of the item to find.
         * @returns Element DOM node that is the item.
         */
        var findNode = function(targetId) {
            var found = null;
            (itemDragging || itemMoving).closest(config.list).find(config.item).each(
                function(index, item) {
                    if (config.idGetter(item) === targetId) {
                        found = item;
                    }
                });
            return found;
        };

        /**
         * Compare two arrays, which just contain simple values like ints or strings,
         * to see if they are equal.
         * @param a1 first array.
         * @param a2 second array.
         * @return boolean true if they both contain the same elements in the same order, else false.
         */
        var arrayEquals = function(a1, a2) {
            return a1.length === a2.length &&
                a1.every(function(v, i) { return v === a2[i]; });
        };

        /**
         * Return string with HTML entities escaped.
         *
         * @param {String} string
         * @returns {String}
         */
        var escapeHTML = function(string) {
            return $('<div />').text(string).html();
        };

        config.itemInPage = combineSelectors(config.list, config.item);
        config.handleInList = combineSelectors(config.item, config.handle);

        // AJAX for section drag and click-to-move.
        $(config.list).on('mousedown touchstart', config.handleInList, function(event) {
            var details = drag.prepare(event);
            if (details.start) {
                startDrag(event, details);
            }
        });

        $(config.list).on('focus', config.handleInList, function(event) {
            itemDragging = $(event.currentTarget).closest(config.itemInPage);
            event.preventDefault();
            event.stopPropagation();
            config.reorderDone(itemDragging.closest(config.list), itemDragging, getCurrentOrder());
        });
    };
});
