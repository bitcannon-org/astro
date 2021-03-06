import {EventEmitter} from 'events';
import parseString from 'xml2js-es6-promise';

const getFeedType = feed => {
    // <torrent xmlns="http://xmlns.ezrss.it/0.1/">
    //    <infoHash>...</infoHash>
    // </torrent>
    if ('torrent' in feed.rss.channel[0]) {
        return {
            torrents: feed.rss.channel[0].torrent,
            items: ('item' in feed.rss.channel[0]) ? feed.rss.channel[0].item : feed.rss.channel[0].torrent,
            namespace: ''
        };
    }

    // <rss xmlns:torrent="http://xmlns.ezrss.it/0.1/">
    //    <torrent:infoHash>...</torrent:infoHash>
    // </rss>
    if (typeof (feed.rss.$['xmlns:torrent']) !== 'undefined') {
        return {
            torrents: feed.rss.channel[0].item,
            items: feed.rss.channel[0].item,
            namespace: 'torrent:'
        };
    }

    // <rss xmlns:atom="http://www.w3.org/2005/Atom">
    //    ...
    //    <enclosure url="http://example.com/example.torrent"
    //               type="application/x-bittorrent"
    //               length="10000"
    //    />
    //    ...
    // </rss>
    return {
        torrents: feed.rss.channel[0].item,
        items: feed.rss.channel[0].item,
        namespace: ''
    };
};

class FeedParser extends EventEmitter {
    constructor(feed) {
        super();
        parseString(feed).then(xml => {
            if ('rss' in xml === false || 'channel' in xml.rss === false) {
                this.emit('error', new Error('NotAnRSSFeed'));
            }

            const {torrents, items, namespace} = getFeedType(xml);

            for (let i = 0; i < torrents.length; i++) {
                // Remove the namespace from namespaced feeds so
                // torrent:infoHash becomes infoHash.
                if (namespace !== '') {
                    for (const prop in torrents[i]) {
                        if (prop.startsWith(namespace)) {
                            const newprop = prop.substring(namespace.length);
                            torrents[i][newprop] = torrents[i][prop];
                            delete torrents[i][prop];
                        }
                    }
                }
                for (const prop in torrents[i]) {
                    // Collapses single array items e.g:
                    // title: ['mytitle'] -> title: 'mytitle'
                    if (
                        torrents[i][prop] instanceof Array &&
                        torrents[i][prop].length === 1 &&
                        !(torrents[i][prop][0] instanceof Object)
                    ) {
                        torrents[i][prop] = torrents[i][prop][0];
                    } else if (
                            torrents[i][prop] instanceof Array &&
                            torrents[i][prop][0] instanceof Object &&
                            Object.keys(torrents[i][prop][0]).length === 1
                        ) {
                        const k = Object.keys(torrents[i][prop][0])[0];
                        torrents[i][prop] = torrents[i][prop][0][k];
                    }
                    // Convert String to Number
                    switch (prop) {
                        case 'seeds':
                        case 'peers':
                        case 'contentLength':
                            torrents[i][prop] = Number(torrents[i][prop]);
                            break;
                        case 'enclosure':
                            if ('length' in torrents[i][prop]) {
                                torrents[i][prop].length = Number(torrents[i][prop].length);
                            }
                            break;
                        default:
                            continue;
                    }
                }
                // Ocassionally there are RSS feeds that take the following format:
                // <torrent>
                //  ...
                // </torrent>
                // <item>
                //  ...
                // </item>
                // AFAIK this is non-standard (http://www.bittorrent.org/beps/bep_0036.html)
                // but sometimes contains useful information such as a description. In this
                // case we return an object containing both the torrent and item tag
                this.emit('torrent',
                (torrents[i] === items[i]) ? {torrent: torrents[i]} : {torrent: torrents[i], item: items[i]});
            }
            this.emit('end');
        }).catch(err => {
            this.emit('error', err);
        });
    }
}

export default FeedParser;
