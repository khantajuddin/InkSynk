let canvases = [];
let canvasContainer = document.getElementById('canvas-container');
let cachedMemoTranslation = {}

const translationObj = []
let idCounter = 0;
let isTextUpdated = false;

function hexToRGBA(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);

    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

function loadImageAsync(src) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

function setDefaultColor(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colorSum = 0;

    for (let i = 0, len = imageData.length; i < len; i += 4) {
        colorSum += imageData[i] * 0.299 + imageData[i + 1] * 0.587 + imageData[i + 2] * 0.114;
    }

    const brightness = Math.floor(colorSum / (canvas.width * canvas.height));

    return brightness < 127.5 ? '#ffffff' : '#000000';
}

async function handleFile(e) {
    document.getElementById("langugeSelector").value = "uk english"
    canvasContainer.innerHTML = "";
    localStorage.clear();
    canvases = [];
    try {
        let files = e.target.files;
        if (files.length === 0) return;

        for (let j = 0; j < files.length; j++) {
            let file = files[j];
            if (!file.name.match(/\.xlsx$/)) {
                await handleImageFile(file);
            } else {
                await handleExcelFile(file);
            }
        }

       
    } catch (error) {
        console.error('Error occurred: ', error);
    }
}
function addEventListeners(canvas){
     // Delete active text on pressing the delete key
     document.addEventListener('keydown', function (e) {
        
        let activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.type === 'i-text') {



            if(e.code === "KeyS" && e.altKey){
                console.log(activeObject)
                if(activeObject.shadow){
                    activeObject.set("shadow", null)
                }else{
                    activeObject.set({
                    shadow: `${ hexToRGBA(activeObject.fill, 0.3)} 0px 0px 5px`
                })
                }
                canvas.renderAll();
            }

            // if(e.code === "KeyC" && e.altKey){
            //     document.querySelector(`input[data-id="${activeObject.idCounter}"]`).click()
            //     console.log(document.querySelector(`input[data-id="${activeObject.idCounter}"]`))
            //     canvas.renderAll();
            // }

            if(e.code === "KeyB" && e.altKey){
                if(activeObject.fontWeight === 700){
                    activeObject.set("fontWeight", 400)
                }else{
                    activeObject.set("fontWeight", 700)
                }
                
                canvas.renderAll();
            }

            if(e.code === "KeyI" && e.altKey){
                if(activeObject.fontStyle ===  'italic'){
                    activeObject.set("fontStyle", 'normal')
                }else{
                    activeObject.set("fontStyle", 'italic')
                }

                
                canvas.renderAll();
            }

            if (e.code === 'Delete') {
                    document.querySelector(`[data-id="${activeObject.idCounter}"]`).remove()
                    canvas.remove(activeObject);
                    canvas.renderAll();
            }
        }
    });

    canvas.on('text:changed', function(e) {
        isTextUpdated = true
    });
}
async function handleImageFile(file) {
    let canvas = createCanvasElement();
    let canvasHeader = document.createElement('div');
    canvasHeader.classList.add("canvas-header")
    canvas.wrapperEl.appendChild(canvasHeader);
    canvasHeader.innerHTML = "<label>Update text colors:</label>"
    let img = await loadImage(file);
    addImageToCanvas(canvas, img);
    // Rest of your canvas handling code
    canvases.push(canvas);

    addText("Image Title", canvas, 40, 40, 40, canvasHeader)
    addText("Image Subtitle", canvas, 84, 40, 24, canvasHeader)
    addText("Image Subtitle 2", canvas,  120, 40, 20, canvasHeader)
    addColorPicker(canvas, canvasHeader);
    addEventListeners(canvas);
    
}

function addColorPicker(canvas, element) {
    const colors = ["black", "white", "blue", "custom"];
    colors.forEach(color => {
        if(color === "custom"){
            let cp = document.createElement('input');
            cp.setAttribute("type", "color");
            cp.addEventListener('input', function (e) {
                console.log(e)
                let activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'i-text') {
                    activeObject.set("fill", e.target.value)
                }
                canvas.requestRenderAll();
            });
            element.appendChild(cp);
        }else{
            let cp = document.createElement('button');
            cp.innerText = color;
            cp.addEventListener('click', function () {
                let activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'i-text') {
                    let fill = color
                    if(color === "blue"){
                        fill = "#0066a1"
                    }
                    activeObject.set("fill", fill)
                }
                canvas.requestRenderAll();
            });
            element.appendChild(cp);
        }
        
        
    })
    let infoText = document.createElement('div');
    infoText.classList.add("keyboard-shortcuts")
    infoText.innerHTML = `
    <code>Shadow: <kbd>Alt + s</kbd></code>
    <code>Bold: <kbd>Alt + b</kbd></code>
    <code>Italic: <kbd>Alt + i</kbd></code>
    `;
    element.appendChild(infoText);
}

function addText(text, canvas, top, left, fontSize = 20, container) {
    let title = new fabric.IText(text, {
        left,
        top,
        fontSize,
        fontWeight: 700,
        fontFamily: "NeueFrutigerWorld, Arial, sans-serif",
        editable: true,
        idCounter: ++idCounter,
        fill: setDefaultColor(canvas)
    });
    canvas.add(title);

    translationObj.push(title)
}

async function handleExcelFile(file, j) {
    let data = await readFileAsync(file);
    let workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
    let firstSheetName = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[firstSheetName];
    let excelData = XLSX.utils.sheet_to_json(worksheet, { raw: true });

    for (let i = 0; i < excelData.length; i++) {
        let dataItem = excelData[i];
        let canvas = createCanvasElement();
        let canvasHeader = document.createElement('div');
        canvasHeader.classList.add("canvas-header")
        canvas.wrapperEl.appendChild(canvasHeader);
        canvasHeader.innerHTML = "<label>Update text colors: </label>"
        let img = await loadImageAsync(dataItem.image);
        addImageToCanvas(canvas, img);
        if (dataItem['Image Title']) {
            addText(dataItem["Image Title"], canvas, 40, 40, 40, canvasHeader)

        }

        if (dataItem['Image Subtitle']) {
            addText(dataItem["Image Subtitle"], canvas, 84, 40, 24, canvasHeader)

        }

        if (dataItem['Image Subtitle 2']) {
            addText(dataItem["Image Subtitle 2"], canvas, 120, 40, 20, canvasHeader)
        }
        addColorPicker(canvas, canvasHeader);
        canvases.push(canvas);

        addEventListeners(canvas);

    }
}

function createCanvasElement() {
    let canvasElement = document.createElement('canvas');
    canvasElement.id = Math.random() + new Date() + "_canvas";
    canvasElement.style.border = '1px solid #000';
    canvasContainer.appendChild(canvasElement);
    return new fabric.Canvas(canvasElement.id);
}

function addImageToCanvas(canvas, img) {
    canvas.setWidth(img.width);
    canvas.setHeight(img.height);
    canvas.setBackgroundImage(new fabric.Image(img), canvas.renderAll.bind(canvas), {
        scaleX: canvas.width / img.width,
        scaleY: canvas.height / img.height
    });
}

async function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                resolve(img);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

document.getElementById('upload').addEventListener('change', handleFile, false);

document.getElementById('download').addEventListener('click', () => {
    for (let i = 0; i < canvases.length; i++) {
        let canvas = canvases[i];

        let dataURL = canvas.toDataURL({ format: 'jpeg' });
        let link = document.createElement('a');
        link.download = 'canvas-' + i + '.jpeg';
        link.href = dataURL;
        link.click();
    }
});

document.getElementById('download-all').addEventListener('click', () => {
    let zip = new JSZip();
    for (let i = 0; i < canvases.length; i++) {
        let canvas = canvases[i];
        let dataURL = canvas.toDataURL({ format: 'jpeg' });
        zip.file('canvas-' + i + '.jpeg', dataURL.substr(dataURL.indexOf(',') + 1), { base64: true });
    }
    zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, 'canvases.zip');
    });
});


const apiKey = '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';
const apiUrl = 'https://api.openai.com/v1/chat/completions';

async function Translate(phrase, id) {

        const message = `Translate the following text in German, French, Dutch, UK English, Italian, Japanese, Chinese, Polish, Turkish, USA English, Arabic, Portuguese and Spanish and return json keys should be lowercased and value should be Propercased : ${phrase}`;
    
        const requestData = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You"
                },
                {
                    role: "user",
                    content: message
                }
            ]
        };
    
        return fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestData)
        })
            .then(response => response.json())
            .then(data => {
                const responseMessage = data.choices[0].message.content;
                const parsedType = JSON.parse(responseMessage)
                if(typeof parsedType === "object"){
                    localStorage.setItem(id, responseMessage)
                    return localStorage.getItem(id)
                }
               
            })
            .catch(error => {
                console.error('Error:', error);
            });
    
}

async function updateLanguage(element){
        const lang = element.value
        document.body.classList.add('translating')

        translationObj.forEach(async (e) => {
            let locatText = localStorage.getItem(e.idCounter)
            if(locatText && isTextUpdated=== false){
                const storageText = JSON.parse(locatText)
                console.log(storageText[lang])
                e.set("text", storageText[lang])
            }else{
                const translatedText = await Translate(e.text, e.idCounter)
                const storageText = JSON.parse(translatedText)
                console.log(storageText[lang])
                e.set("text", storageText[lang])
                isTextUpdated = false
            }
           
            await canvases.forEach(canvas => {
                canvas.renderAll()
            })
            document.body.classList.remove('translating')
        })
}