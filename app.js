const Nanocomponent = require('nanocomponent')
const choo = require('choo')
const html = require('choo/html')
const polyfill = require("mobile-drag-drop").polyfill;

// options are optional ;)
polyfill();

const css = require("sheetify");
css('./reset.css')
css('./app.css')

// for safari IOS
window.addEventListener( 'touchmove', function() {});

class TodoApp extends Nanocomponent {
  constructor () {
    super();
    this.init();
  }
  init () {
    this.textbox = "";
  }
  click (e) {
    const text = this.textbox;
    this.init();
    this.emit("add_todo", text)
  }
  onchange (e) {
    this.textbox = e.target.value;
  }

  update (state) {
    return true;
  }
  createElement (state, emit) {
    this.state = state;
    this.emit = emit;
    return html`
    <div class="todo-app">
      <div class='appTitle'>Todo List</div>>
      <input type="text" onkeyup=${(e) => { (e.keyCode===13) ? this.click() : undefined }} onchange=${this.onchange.bind(this)} value="${this.textbox}" />
      <input type="button" value="Add Todo" onclick=${this.click.bind(this)} />
    </div>
    `;
  }
}

class Wastebasket extends Nanocomponent {
  constructor () {
    super();
    this.numTrash = 0;
  }
  update () {
    return true;
  }

  load (el) {
    this.el = el;
  }

  ondrop (ev) {
    this.numTrash++;
    console.log("ON DROP TRASH!!:", this.numTrash);
    ev.preventDefault();
    var id = ev.dataTransfer.getData("id");
    this.emit("remove_todo", id)
    this.el.animate([
      {transform:'scale(1,1)'},
      {transform:'scale(2,1)'},
      {transform:'scale(1.5,1)'},
      {transform:'scale(1,1)'}
    ], 
    {
      duration:500
    })
    this.rerender();
  }
  ondragover (ev) {
    ev.preventDefault();
  }
  createElement (state, emit) {
    this.numTrash = state.trash.length
    this.emit = emit;
    return html`
    <div ondrop=${this.ondrop.bind(this)} ondragenter=${(e) => e.preventDefault()} ondragover=${this.ondragover.bind(this)} class='wastebasket'>
    ${(this.numTrash > 0) ? html`<div class='numTrash'>${this.numTrash}</div>` : ""}
    </div>
    `
  }  
}

class ViewList extends Nanocomponent {
  constructor () {
    super();
  }
  toggle (idx) {
    console.log("viewList:toggle:", idx)
    this.state.list[idx].completed = !this.state.list[idx].completed;
    this.rerender();
  }
  drag(ev) {
    console.log("ev.target.id", ev.target.id)
    ev.dataTransfer.setData("id", ev.target.id);
  } 

  itemToMarkup (item) {
    return html`<li id=${`list_${item.idx}`} draggable="true" ondragstart=${this.drag.bind(this)} onclick=${() => this.toggle(item.idx) } class="todo-item">${item.completed ? html`<span class='checkmark'>✔</span>` : ""}<span class="todo-item__text${item.completed ? '--completed' : ''}">${item.text}</span></li>`;
  }

  trashToMarkup(item, idx) {
    return html`<li class='todo-item' id=${`trash_${idx}`}>${item.completed ? html`<span class='checkmark'>✔</span>` : ""}<span class="todo-item__text${item.completed ? '--completed' : ''}">${item.text}</span>
    <input type='button' value='restore' onclick=${() => {this.emit("restoreFromTrash", idx)} } /></li>`
  }

  returnList (list, trash, filter) {
    switch (filter) {
      case 'all':
      return list.map(this.itemToMarkup.bind(this))
      break;
      case 'completed':
      return list.map((item, idx) => { 
        item.idx = idx;
        return item
      }).filter((item) => item.completed).map(this.itemToMarkup.bind(this))
      break;
      case 'incomplete':
      return list.map((item, idx) => { 
        item.idx = idx;
        return item;
      }).filter((item) => !item.completed).map(this.itemToMarkup.bind(this))
      break;
      case 'trash':
      return trash.map(this.trashToMarkup.bind(this))
      break;
      default:
      break;
    }
  }
  createElement (state, emit) {
    this.state = state;
    this.emit = emit;
    console.log("viewList:render", state)
    const list = state.list;
    console.log("ViewList List:", list)
    return html`<div class='viewList'><div class='title'>ViewList</div>
    <ul class="todo-list">
    ${this.returnList(list, state.trash, state.filter)}
    </ul>
    </div>`
  }
  update () {
    console.log("viewList:update");
    return true;
  }
}


class Selector extends Nanocomponent {
  constructor () {
    super();
  }

  filter (type) {
    this.emit('changeFilter', type)
    this.rerender();
  }

  createElement (state, emit) {
    this.emit = emit;
    return html`
      <div class="visibility-filters">
      <span onclick=${() => this.filter("all")} class="filter filter${state.filter === 'all' ? '--active' : ''}">all</span>
      <span onclick=${() => this.filter("completed")} class="filter filter${state.filter === 'completed' ? '--active' : ''}">completed</span>
      <span onclick=${() => this.filter("incomplete")} class="filter filter${state.filter === 'incomplete' ? '--active' : ''}">incomplete</span>
      <span onclick=${() => this.filter("trash")} class="filter filter${state.filter === 'trash' ? '--active' : ''}">trash</span>
      </div>
    `
  }
  update () {
    return true;
  }
}


var app = choo()
var todoApp = new TodoApp;
var viewList = new ViewList;
var selector = new Selector;
var wastebasket = new Wastebasket;

const storage = window.localStorage;

function mainView (state, emit) {
  return html`<body>
  <div class='app'> 
    <div style='display:flex;justify-content:space-between;'>
      ${todoApp.render(state, emit)}
      <div>
        <div class='configuration'>Configuration</div>
        <div class='configurationIcon'></div>
      </div>
    </div>
    <div style='display:flex; flex-direction:row;justify-content:space-between;margin-top:2em;'>
    ${viewList.render(state, emit)}
    ${wastebasket.render(state, emit)}
    </div>
    ${selector.render(state, emit)}
  </div>
  <div style='position:fixed; bottom:0; right:0;'><input type='button' value='total reset' onclick=${() => {emit("reset");}}/></div>
  </body>`
}

const getInitialState = () => {
  return {
    trash : [],
    list : [],
    filter: "all"
  }
}
app.use((state, emitter) => {
  Object.assign(state, getInitialState())

  emitter.on("reset", () => {
    Object.assign(state, getInitialState())
    storage.setItem("state", JSON.stringify(state))
    emitter.emit("render")
  });
  emitter.on('restoreFromTrash', (idx) => {
    const item = state.trash.splice(idx,1)[0];
    state.list.push(item);
    console.log("PUshing item onto state:", item, "new state:", state.list);
    storage.setItem("state", JSON.stringify(state))
    emitter.emit("render")
  })
  emitter.on("add_todo", (text) => {
    state.list.push({text, completed:false});
    storage.setItem("state", JSON.stringify(state))
    emitter.emit("render")
  })
  emitter.on("remove_todo", (id) => {
    console.log("REMOVE TOODO:", id)
    const idx = id.match(/_(\d+)/)[1]
    const trashItem = state.list.splice(idx,1)[0];
    state.trash.push(trashItem);
    storage.setItem("state", JSON.stringify(state))
    emitter.emit("render")
  })  
})
app.use((state, emitter) => {
  state.filter = "all" // "completed", "incomplete", "trash"
  emitter.on("changeFilter", (type) => {
    state.filter = type;
    storage.setItem("state", JSON.stringify(state))
    viewList.rerender();
  });
});

app.use((state, emitter) => {
  const stateText = storage.getItem("state")
  if (stateText) {
    const _state = JSON.parse(stateText);
    if (_state.list) {
      state.list = _state.list.slice();
    }
    if (_state.filter) 
      state.filter = _state.filter;
    if (_state.trash) 
      state.trash = _state.trash;
    emitter.emit("render");
  }
})

app.route('/', mainView)
app.mount('body')
