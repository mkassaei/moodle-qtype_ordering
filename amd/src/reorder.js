define(['jquery', 'qtype_ordering/drag_reorder', 'core/key_codes'], function($, dragReorder, keys) {
    /**
     * Object to handle one ordering question.
     *
     * @param {String} sortableid id of ul for this question.
     * @param {String} responseid id of ul for this question.
     * @param {String} ablockid id of ul for this question.
     * @param {String} axis id of ul for this question.
     * @constructor
     */
    function OrderingQuestion(sortableid, responseid, ablockid, axis) {
        this.sortableid = sortableid;
        this.responseid = responseid;
        this.ablockid = ablockid;
        if (axis === 'y') {
            this.layoutType = 1;
        } else {
            this.layoutType = 2;
        }
        this.axis = axis;
    };

    /**
     * Get list selector
     *
     * @returns {string} the html tag and css for the list selectoer.
     */
    OrderingQuestion.prototype.getListSelector = function() {
        return 'ul#' + this.sortableid;
    };

    /**
     * Get item selector
     *
     * @returns {string} the html tag and css for the list selectoer.
     */
    OrderingQuestion.prototype.getItemSelector = function() {
        return 'li.sortableitem';
    };

    /**
     * Get item selector
     *
     * @returns {string} the html tag and css for the list selectoer.
     */
    OrderingQuestion.prototype.getHandleSelector = function() {
        return '';
    };

    /**
     * Get hidden input value for this question.
     *
     * @returns {jQuery} containing the ul (list of item).
     */
    OrderingQuestion.prototype.getHiddenInputValues = function() {
        return $('input#' + this.responseid)[0].value;
    };

    /**
     * Update hidden input value for this question.
     * @param {String} comma separated list of ids.
     */
    OrderingQuestion.prototype.updateHiddenInputValues = function(value) {
        $('input#' + this.responseid)[0].value = value;
    };

    /**
     * Get layout type for this question.
     *
     * @returns {int} 1 for Vertical and 2 for Horisontal.
     */
    OrderingQuestion.prototype.getLayoutType = function() {
        return this.layoutType;
    };

    /**
     * Get the ul for this question (List of items).
     *
     * @returns {jQuery} containing list of items.
     */
    OrderingQuestion.prototype.getItems = function() {
        return $($(this.getListSelector()).children());
    };

    /**
     * Get the number of items.
     *
     * @returns int the number of items.
     */
    OrderingQuestion.prototype.getNumberOfItems = function() {
        return this.getItems().length;
    };

    /**
     * Return an array of item ids in original order.
     */
    OrderingQuestion.prototype.getCurrentOrder = function() {
        var thisQ = this;
        var originalOrder = [];
        thisQ.getItems().each(function (index, item) {
            $(item).attr('tabindex', '0');
            originalOrder[index] = item;
        });
        return originalOrder;
    };


    /**
     * Animate an object to the given destination.
     *
     * @param {jQuery} drag the element to be animated.
     * @param {jQuery} target element marking the place to move it to.
     */
    OrderingQuestion.prototype.animateTo = function(drag, target) {
        var currentPos = drag.offset(),
            targetPos = target.offset();
        drag.addClass('beingdragged');


        // Animate works in terms of CSS position, whereas locating an object
        // on the page works best with jQuery offset() function. So, to get
        // the right target position, we work out the required change in
        // offset() and then add that to the current CSS position.
        drag.animate(
            {
                left: parseInt(drag.css('left')) + targetPos.left - currentPos.left,
                top: parseInt(drag.css('top')) + targetPos.top - currentPos.top
            },
            {
                duration: 'fast',
                done: function() {
                    drag.removeClass('beingdragged');
                    // It seems that the animation sometimes leaves the drag
                    // one pixel out of position. Put it in exactly the right place.
                    drag.offset(targetPos);
                }
            }
        );
    };

    var qm = {
        /**
         * {OrderingQuestion[]} all the questions on this page, indexed by containerId (id on the .que div).
         */
        questions: [],

        sortableid: null,
        responseid: null,
        ablockid: null,

        init: function (sortableid, responseid, ablockid, axis) {
            qm.sortableid = sortableid;
            qm.responseid = responseid;

            qm.questions[sortableid] = new OrderingQuestion(sortableid, responseid, ablockid, axis);
            var currentorder = qm.questions[qm.sortableid].getCurrentOrder();

            qm.initDragReorder(sortableid);
        },

        initDragReorder: function (sortableid) {
            // Drag of sortable items.
            new dragReorder({
                list: qm.questions[sortableid].getListSelector(),
                item: qm.questions[sortableid].getItemSelector(),
                handle: '',
                proxyHtml: '<div class="%%ITEM_CLASS_NAME%% item-moving" id="%%ITEM_ID_NAME%%">%%ITEM_HTML%%</div>',
                itemMovingClass: "item-moving",
                idGetter: function (item) { return $(item).attr('id'); },
                nameGetter: function (item) { return $(item).text(); },
                reorderStart: qm.itemMoveStart,
                reorderEnd: qm.itemMoveEnd,
                reorderDone: qm.itemMoved
            });
        },

        itemMoveStart: function(items, item) {
            var thisId = item.closest('ul.sortablelist > li.sortableitem').attr('id');
            $('ul.sortablelist > li:not([id ="' + thisId +'"])').addClass('invalid-target');
        },
        
        itemMoveEnd: function() {
            $('ul.sortablelist > li').removeClass('invalid-target').removeClass('item-moving');
        },

        itemMoved: function(itemList, item, newOrder) {
            item.css(
                {
                    position: 'relative',
                    opacity: 1,
                    left: 0 + 'px',
                    top: 0 + 'px'
                }
            );
            qm.itemMovedKeyboard(itemList, item, newOrder);

            qm.questions[qm.sortableid].animateTo(item, item)

            // Update the hidden form elements
            qm.questions[qm.sortableid].updateHiddenInputValues(newOrder.join(','));
        },

        itemMovedKeyboard: function (itemList, item, newOrder) {
            // Keyboard access.
            item.on('keydown', function(e) {
                //item.addClass('item=moving');
                switch (e.keyCode) {
                    case keys.tab:
                        item.removeClass('item-moving');
                        return;
                    case keys.space:
                    case keys.arrowRight:
                    case keys.arrowDown:
                        e.preventDefault();
                        e.stopPropagation();
                        var current = document.getElementById(item.attr('id'));
                        var next = current.nextSibling;
                        if (next !== null) {
                            item.addClass('item-moving');
                            next.parentNode.insertBefore(next, next.previousSibling);
                        }
                        break;

                    case keys.arrowLeft:
                    case keys.arrowUp:
                        e.preventDefault();
                        e.stopPropagation();
                        var current = document.getElementById(item.attr('id'));
                        var prev = current.previousSibling;

                        if (prev !== null) {
                            item.addClass('item-moving');
                            prev.parentNode.insertBefore(prev, prev.nextSibling.nextSibling);
                        }
                        break;
                    default:
                        return;
                }

                 //item.removeClass('item-moving');
                 qm.questions[qm.sortableid].animateTo(item, item)
                 qm.questions[qm.sortableid].updateHiddenInputValues(newOrder.join(','));
            });
        }
    };
    return qm;
});
