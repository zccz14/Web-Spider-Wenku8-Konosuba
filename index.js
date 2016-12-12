const co = require('co');
const request = require('superagent');
const charset = require('superagent-charset');
const retry = require('superagent-retry');
const cheerio = require('cheerio');
const leftPad = require('left-pad');
const fs = require('fs');
const path = require('path');

charset(request);
retry(request);

const IndexURL = `http://www.wenku8.com/novel/1/1657/`;
const savePath = `konosuba`;
const fetchImages = true;
const retryTimes = 3;

co(function* () {
    let resIndex = yield request(IndexURL).retry(retryTimes).charset('gbk').then(v => v.text);
    let $ = cheerio.load(resIndex);
    let hrefs = $('table a').map((i, e) => e.attribs.href).toArray();
    let sum = 0;
    for (let i = 0; i < hrefs.length; i++) {
        let $ = yield request(IndexURL + hrefs[i])
            .charset('gbk')
            .retry(retryTimes)
            .then(v => v.text)
            .then(v => cheerio.load(v));
        let title = $('#title').text();
        let content = $('#content').text();
        let filename = `${leftPad(i, 3, '0')} ${title}`;
        fs.writeFileSync(path.join(__dirname, savePath, filename + '.txt'), content);
        console.log(`[fetch][${++sum}/${hrefs.length}]${filename}`);
        if (fetchImages) {
            let imgSrcs = $('img').map((i, e) => e.attribs.src).toArray();
            let sum = 0;
            for (let ii = 0; ii < imgSrcs.length; ii++) {
                let res = yield request(imgSrcs[ii]).retry(retryTimes);
                if (res.redirects.length > 0) {
                    imgSrcs[ii] = res.redirects[0];
                    res = yield request(imgSrcs[ii]).retry(retryTimes).then(v => v.body);
                }
                let imageFilename = `${filename}[${leftPad(ii, 2, '0')}]${path.extname(imgSrcs[ii])}`;
                fs.writeFileSync(path.join(__dirname, savePath, imageFilename), res);
                console.log(`[fetch][${++sum}/${imgSrcs.length}]${imageFilename}`);
            }
        }
    }
}).catch(err => console.log(err));