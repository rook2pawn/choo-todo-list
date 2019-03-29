const Nanocomponent = require('nanocomponent')
const choo = require('choo')
const html = require('choo/html')
const css = require("sheetify");
css('./reset.css')
css('./app.css')

class TodoApp extends Nanocomponent {
  constructor () {
    super();
    this.init();
  }
  init () {
    console.log("todoApp:init");
    this.textbox = "";
  }
  click (e) {
    this.state.list.push({text:this.textbox, completed:false});
    this.init();
    this.emit("add_todo")
  }
  onchange (e) {
    this.textbox = e.target.value;
  }

  update (state) {
    console.log("todoApp:update!");
    return true;
  }

  createElement (state, emit) {
    console.log("TodoApp:render : state:", state)
    this.state = state;
    this.emit = emit;
    return html`
    <div class="todo-app">
      <h1>Todo List</h1>
      <input type="text" onchange=${this.onchange.bind(this)} value="${this.textbox}" />
      <input type="button" value="Add Todo" onclick=${this.click.bind(this)} />
    </div>
    `;
  }
}

class Wastebasket extends Nanocomponent {
  constructor () {
    super();
  }
  update () {
    return false;
  }
  ondrop (ev) {
    ev.preventDefault();
    var id = ev.dataTransfer.getData("id");
    this.emit("remove_todo", id)
  }
  ondragover (ev) {
    ev.preventDefault();
  }
  createElement (state, emit) {
    this.emit = emit;
    return html`
    <div ondrop=${this.ondrop.bind(this)} ondragover=${this.ondragover.bind(this)} class='wastebasket'></div>
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
  createElement (state) {
    this.state = state;
    console.log("viewList:render", state)
    const list = state.list;
    console.log("ViewList List:", list)
    return html`<div class='viewList'><div class='title'>ViewList</div>
    <ul class="todo-list">
    ${list
      .filter((item) => {

        switch (state.filter) {
          case 'all' :
            return true
          break;
          case 'completed' :
            return item.completed
          break;
          case 'incomplete' :
            return !item.completed
          break;
          default:
            return true;
          break;
        }
      })
      .map((item,idx) =>
        html`<li id=${`list_${idx}`} draggable="true" ondragstart=${this.drag.bind(this)} onclick=${() => this.toggle(idx) } class="todo-item">${item.completed ? html`<span class='checkmark'>✔</span>` : ""}<span class="todo-item__text${item.completed ? '--completed' : ''}">${item.text}</span></li>`)}
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
    ${todoApp.render(state, emit)}
    <div style='display:flex; flex-direction:row;margin-top:2em;'>
    ${viewList.render(state, emit)}
    ${wastebasket.render(state, emit)}
    </div>
    ${selector.render(state, emit)}
  </div>
  </body>`
}
app.use((state, emitter) => {
  state.trash = [];
  state.list = [];
  emitter.on("add_todo", () => {
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
    if (_state.list) 
      state.list = _state.list.slice();
    if (_state.filter) 
      state.filter = _state.filter;
    emitter.emit("render");
  }
})

app.route('/', mainView)
app.mount('body')
