define(['jquery', 'qtype_ordering/drag_reorder'], function($, dragReorder) {
    return {
        /**
         * Initialise one ordering question.
         *
         * @param {String} sortableid id of ul for this question.
         * @param {String} responseid id of hidden field for this question.
         */
        init: function (sortableid, responseid) {
            new dragReorder({
                list: 'ul#' + sortableid,
                item: 'li.sortableitem',
                proxyHtml: '<div class="%%ITEM_CLASS_NAME%% item-moving" id="%%ITEM_ID_NAME%%">%%ITEM_HTML%%</div>',
                itemMovingClass: "item-moving",
                idGetter: function (item) { return $(item).attr('id'); },
                nameGetter: function (item) { return $(item).text; },
                reorderStart: function() {},
                reorderEnd: function() {},
                reorderDone: function(list, item, newOrder) {
                    $('input#' + responseid)[0].value = newOrder.join(',');
                }
            });
        }
    };
});
