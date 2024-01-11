// localStorage
function getClickedLinks() {
    let nameStorage = 'selectedLinks' + window.location.search;
    return (localStorage.getItem(nameStorage) != undefined)
        ? JSON.parse(localStorage.getItem(nameStorage)) : [];
}
function setClickedLinks(link, selectedLinks) {
    let id = getLinkId(link);
    let nameStorage = 'selectedLinks' + window.location.search;
    if (!selectedLinks.includes(id)) {
        selectedLinks.push(id);
        localStorage.setItem(nameStorage, JSON.stringify(selectedLinks));
    }
}
function isClickedLink(link, selectedLinks) {
    let id = getLinkId(link);
    if (selectedLinks.includes(id)) {
        return true;
    }
    return false;
}
//link ID
function getLinkId(url) {
    let linkArr = url.split('/')
    return linkArr[linkArr.length - 2] + '/' + linkArr[linkArr.length - 1];
}
//log ID
function getLogId(url) {
    let parts = url.split('/');
    do {
        lastPart = parts.pop();
    } while (lastPart.trim() === "" && parts.length > 0);
    return lastPart;
}
//Формуємо посилання на лист (листи із сканами документів)
function getEmlUrl(fileUrl) {
    return fileUrl.replace('takeDir.php?n=', '/').replace('/alarm/', '/tmp/scan/').replace('_', '/').replace(/\/+$/, '.eml');
}

// Створюємо та додаємо елемент з текстом логу
async function loadTextFile(url, id) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const paragraph = document.createElement("p");
        paragraph.style.backgroundColor = '#333333';
        paragraph.style.color = '#e0e0e0';
        paragraph.textContent = data;
        const targetElement = document.getElementById(id);
        if (targetElement) {
            targetElement.appendChild(paragraph);
        } else {
            console.error(`Елемент з id "${id}" не знайдений.`);
        }
    } catch (error) {
        console.error('Помилка при завантаженні текстового файлу:', error);
    }
}

// Створюємо div з посиланнями
function getLinks(url, selectedLinks) {
    return fetch(url)
        .then(response => response.text())
        .then(data => {
            // Створюємо об'єкт DOM для обробки контенту
            let parser = new DOMParser();
            let htmlDoc = parser.parseFromString(data, 'text/html');
            // Знаходимо всі посилання (a) за допомогою селектора
            let links = htmlDoc.querySelectorAll('table a');
            // Створюємо новий елемент div
            let id = getLogId(url);
            let div = document.createElement('div');
            div.setAttribute('id', id);
            div.style.border = '5px solid black';
            div.style.marginBottom = '30px';
            div.style.backgroundColor = '#e0e0e0';
            // Додаємо кожне посилання до нового елемента div
            links.forEach(link => {
                let fileUrl = link.getAttribute("href");
                if (fileUrl.substr(fileUrl.length - 4) === ".log") {
                    if (fileUrl.includes("Eml_N")) {
                        loadTextFile(link, id);
                    }
                } else {
                    link.style.fontWeight = 'bold';
                    if (isClickedLink(fileUrl, selectedLinks)) {
                        link.style.color = '#b2b2b2';
                    } else if (fileUrl.substr(fileUrl.length - 4) === ".eml") {
                        link.style.color = '#cc0000';
                        link.classList.add('eml');
                        link.removeAttribute('target');
                    } else {
                        link.style.color = '#cca300';
                    }
                }
                div.appendChild(link);
                div.appendChild(document.createElement('br'));
            });

            if (url.includes(".ip6")) {
                let emlLink = document.createElement('a');
                const emlUrl = getEmlUrl(url);
                emlLink.setAttribute('href', emlUrl);
                emlLink.innerHTML = emlUrl.split('/').pop();
                emlLink.style.fontWeight = 'bold';
                emlLink.style.color = isClickedLink(emlUrl, selectedLinks) ? '#b2b2b2' : '#cc0000';
                emlLink.classList.add('eml');
                emlLink.removeAttribute('target');
                div.appendChild(emlLink);
            }

            // Повертаємо новий елемент diva
            return div;
        })
        .catch(error => {
            console.error('Помилка:', error);
            return null;
        });
}

// Додаємо div на сторінку
function appendElements(selectedLinks) {
    let ids = [];
    let tableRows = document.querySelectorAll("table > tbody > tr");
    tableRows.forEach(function (row) {
        let firstChild = row.children[0];
        if (firstChild) {
            let report = firstChild.children[0];
            if (report) {
                let reportUrl = report.getAttribute("href");
                report.style.color = "#b2b2b2";
                if (reportUrl.includes("Eml_N") || reportUrl.includes(".ip6")) {
                    // Викликаємо функцію та отримуємо об'єкт DOM з посиланнями
                    getLinks(reportUrl, selectedLinks).then(domObject => {
                        if (domObject) {
                            // Вставляємо об'єкт DOM з посиланнями у документ
                            firstChild.appendChild(domObject);
                            ids.push(domObject.id);
                        } else {
                            console.error('Помилка отримання об\'єкта DOM');
                        }
                    });

                }
            }
        }
    });
    return ids;
}

/*----------------------- Автоматичне скачування -----------------------*/

// Функція для скачування файлів
async function clickLinks(selectedLinks, searchString) {
    const links = document.getElementsByClassName('eml');
    let count = 0;

    for (const link of links) {
        const fileUrl = link.getAttribute("href");
        // Перевіряємо наявність searchString
        const stringPresent = searchString && typeof searchString === 'string';
        // перевіряємо наявнісь параграфу, що містить рядок пошуку
        const hasParagraph = Array.from(link.parentNode.children).some((sibling) => 
            sibling.tagName.toLowerCase() === 'p' && sibling.textContent.includes(searchString)
        );

        // Перевірка на знайдений параграф
        if (link && (!stringPresent || hasParagraph) && !isClickedLink(fileUrl, selectedLinks)) {
            // Створюємо подію кліку
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });

            // Чекаємо невелику затримку перед кожним кліком
            await new Promise(resolve => setTimeout(resolve, 100));

            // Симулюємо клік на посиланні
            link.dispatchEvent(clickEvent);
            count++;
        }
    }    
    console.log(count);
}

// Функція для виклику при кліку на кнопку пошуку
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchString = searchInput.value.trim();
    // Виклик функції clickLinks з новим рядком пошуку
    clickLinks(selectedLinks, searchString);
}

// Додаваємо елемент пошуку на сторінку
function appendSearchElement() {
    const searchContainer = document.createElement('div');
    searchContainer.id = 'searchContainer';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'searchInput';
    const button = document.createElement('button');
    button.textContent = '📥';
    button.onclick = performSearch;
    searchContainer.appendChild(input);
    searchContainer.appendChild(button);
    document.body.appendChild(searchContainer);
    searchContainer.style.position = 'fixed';
    searchContainer.style.top = '0';
    searchContainer.style.right = '0';
    searchContainer.style.padding = '10px';
    searchContainer.style.transform = 'scale(1.5)';
    searchContainer.style.transformOrigin = 'top right';
}

/*----------------------- Виконання -----------------------*/

// Отримуємо перелік посилань які вже натискали
/*let selectedLinks = getClickedLinks();

// Створюємо елементи з посиланнями
appendElements(selectedLinks);

// Додаємо обробник кліка до всього документу
document.addEventListener("click", function (event) {
    let target = event.target;
    // Перевіряємо чи клік був на посиланні
    if (target.tagName === "A") {
        let selectedLink = target.getAttribute('href');
        setClickedLinks(selectedLink, selectedLinks);
        target.style.color = "#b2b2b2";
    }
});

// Додаваємо елемент пошуку на сторінку
appendSearchElement();
*/
