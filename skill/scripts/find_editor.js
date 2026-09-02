// find_editor.js - Detect WeChat MP editor type and locate key elements
// Usage: agent-browser eval "$(Get-Content <skill_path>/scripts/find_editor.js -Raw -Encoding UTF8)"
// Returns: Editor type, title element info, body element info

(function() {
    var result = {
        editorType: 'unknown',
        titleElement: null,
        bodyElement: null,
        allEditable: [],
        debugInfo: []
    };

    // 1. Check for ProseMirror (current WeChat editor)
    var proseMirror = document.querySelector('.ProseMirror');
    if (proseMirror) {
        result.editorType = 'ProseMirror';
        result.bodyElement = {
            tag: proseMirror.tagName,
            class: (proseMirror.className || '').substring(0, 60),
            textPreview: proseMirror.textContent.substring(0, 50)
        };
    }

    // 2. Check for UEditor (legacy)
    var ueditor = document.querySelector('#ueditor_0') || document.querySelector('.edui-body-container');
    if (ueditor && !result.bodyElement) {
        result.editorType = 'UEditor';
        result.bodyElement = {
            tag: ueditor.tagName,
            class: (ueditor.className || '').substring(0, 60)
        };
    }

    // 3. Find title element by scanning contenteditable divs
    var editables = document.querySelectorAll('[contenteditable="true"]');
    result.allEditableCount = editables.length;
    
    for (var i = 0; i < editables.length; i++) {
        var el = editables[i];
        var text = el.textContent.trim();
        var info = {
            index: i,
            tag: el.tagName,
            class: (el.className || '').substring(0, 50),
            id: el.id || '',
            textLength: text.length,
            textPreview: text.substring(0, 40)
        };
        
        // Identify title area
        if (text.indexOf('请在这里输入标题') > -1 || 
            (text.length <= 64 && el.className.indexOf('title') > -1)) {
            result.titleElement = info;
        }
        
        // Identify body area
        if (text.indexOf('从这里开始写正文') > -1 ||
            (el === proseMirror && !result.bodyElement)) {
            if (!result.bodyElement) result.bodyElement = info;
        }
        
        result.allEditable.push(info);
    }

    // 4. Also check for specific WeChat title classes
    if (!result.titleElement) {
        var titleByClass = document.querySelector('.weui-desktop-title__input') ||
                          document.querySelector('[class*="title__input"]') ||
                          document.querySelector('input[placeholder*="标题"]');
        if (titleByClass) {
            result.titleElement = {
                tag: titleByClass.tagName,
                class: (titleByClass.className || '').substring(0, 50),
                placeholder: titleByClass.placeholder || '',
                type: titleByClass.type || ''
            };
        }
    }

    return JSON.stringify(result, null, 2);
})();
