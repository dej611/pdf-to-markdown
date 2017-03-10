import ToTextItemBlockTransformation from './ToTextItemBlockTransformation.jsx';
import ParseResult from '../ParseResult.jsx';
import TextItemBlock from '../TextItemBlock.jsx';
import { ADDED_ANNOTATION } from '../Annotation.jsx';
import { minXFromTextItems } from '../../textItemFunctions.jsx';

// Gathers lines to blocks
export default class GatherBlocks extends ToTextItemBlockTransformation {

    constructor() {
        super("Gather Blocks");
    }

    transform(parseResult:ParseResult) {
        const {mostUsedDistance} = parseResult.globals;
        var createdBlocks = 0;
        var textItems = 0;
        parseResult.pages.map(page => {
            textItems += page.items.length;
            const blocks = [];
            var stashedBlock = new TextItemBlock({});
            const flushStashedItems = () => {
                if (stashedBlock.textItems.length > 1) {
                    stashedBlock.annotation = ADDED_ANNOTATION;
                }

                blocks.push(stashedBlock);
                stashedBlock = new TextItemBlock({});
                createdBlocks++;
            };

            var minX = minXFromTextItems(page.items);
            page.items.forEach(item => {
                if (stashedBlock.textItems.length > 0 && shouldFlushBlock(stashedBlock, item, minX, mostUsedDistance)) {
                    flushStashedItems();
                }
                stashedBlock.addTextItem(item);
            });
            if (stashedBlock.textItems.length > 0) {
                flushStashedItems();
            }
            page.items = blocks;
        });

        return new ParseResult({
            ...parseResult,
            messages: ['Gathered ' + createdBlocks + ' blocks out of ' + textItems + ' text items']
        });
    }

}

function shouldFlushBlock(stashedBlock, item, minX, mostUsedDistance) {
    if (stashedBlock.type && stashedBlock.type.mergeFollowingNonTypedItems && !item.type) {
        return false;
    }
    if (item.type !== stashedBlock.type) {
        return true;
    }
    if (item.type) {
        return !item.type.mergeToBlock;
    } else {
        console.debug(item);
        const lastItem = stashedBlock.textItems[stashedBlock.textItems.length - 1];
        return shouldSplit(lastItem, item, minX, mostUsedDistance);
    }
}


function shouldSplit(lastItem, item, minX, mostUsedDistance) {
    const distance = lastItem.y - item.y;
    if (distance < 0 - mostUsedDistance / 2) {
        //distance is negative - and not only a bit
        return true;
    }
    var allowedDisctance = mostUsedDistance + 1;
    if (lastItem.x == item.x && item.x > minX) {
        //intended elements like lists often have greater spacing
        allowedDisctance = mostUsedDistance + mostUsedDistance / 2;
    }
    if (distance > allowedDisctance) {
        return true;
    }
    return false;
}