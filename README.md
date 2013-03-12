## SEN: S-Expression Notation ##

In Lisp, data is code. Coincidentally, Lisp stands for LISt-Processing, and if you've ever seen a line of lisp (usually followed by "sweet mother of jesus what are all these parentheses?"), you'll know that lists are easy to express:

```lisp
(0 1 2 3)
```

(In the off chance jAndy reads this: The Game)

Hey, lists are pretty integral to every data manipulation, and we usually deal with trees, and Lisp data is already oriented towards tree-based structures. And when we really strip down all functionality of Lisp, we really just get an AST (Abstract Syntax Tree).

hmm...I wonder where this will lead us to...

### A small comparison ###
A typical (*shudder*) Java stack trace. Taken from: https://github.com/huxi/lilith/blob/master/sandbox/jul-sandbox/log.xml
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE log SYSTEM "logger.dtd">
<log>
  <record>
    <date>2011-07-10T19:11:32</date>
	<millis>1310317892812</millis>
	<sequence>0</sequence>
	<logger>de.huxhorn.lilith.sandbox.JulSandbox</logger>
	<level>INFO</level>
	<class>de.huxhorn.lilith.sandbox.JulSandbox</class>
	<method>main</method>
	<thread>1</thread>
	<message>Args</message>
  </record>
  <record>
    <date>2011-07-10T19:11:32</date>
	<millis>1310317892906</millis>
	<sequence>1</sequence>
	<logger>de.huxhorn.lilith.sandbox.JulSandbox$InnerClass</logger>
	<level>INFO</level>
	<class>de.huxhorn.lilith.sandbox.JulSandbox$InnerClass</class>
	<method>execute</method>
	<thread>1</thread>
	<message>Foo!</message>
  </record>
</log>
```

That's the raw XML. Luckily, we don't have attributes. How fares JSON?

```json
{
  "log": [
    {
      "date": "2011-07-10T19:11:32",
      "millis": 1310317892812,
      "sequence": 0,
      "logger": "de.huxhorn.lilith.sandbox.JulSandbox",
      "level": "INFO",
      "class": "de.huxhorn.lilith.sandbox.JulSandbox",
      "method": "main",
      "thread": 1,
      "message": "Args"
    },
    {
      "date": "2011-07-10T19:11:32",
      "millis": 1310317892906,
      "sequence": 1,
      "logger": "de.huxhorn.lilith.sandbox.JulSandbox$InnerClass",
      "level": "INFO",
      "class": "de.huxhorn.lilith.sandbox.JulSandbox$InnerClass",
      "method": "execute",
      "thread": 1,
      "message": "Foo!"
    }
  ]
}
```

That's a lot cleaner. The fact that each object in `log` is a `record` was lost, but that's mostly irrelevant. In hindsight, we (and by we, I mean I) could have disposed of the root `log` key altogether, and just do with the array.

Now, what about SEN?

```lisp
(:log
  ((:date 2011-07-10T19:11:32
    :millis 1310317892812
    :sequence 0
    :logger de.huxhorn.lilith.sandbox.JulSandbox
    :level INFO
    :class de.huxhorn.lilith.sandbox.JulSandbox
    :method main
    :thread 1
    :message Args)
   (:date 2011-07-10T19:11:32
    :millis 1310317892906
    :sequence 1
    :logger de.huxhorn.lilith.sandbox.JulSandbox$InnerClass
    :level INFO
    :class de.huxhorn.lilith.sandbox.JulSandbox$InnerClass
    :method execute
    :thread 1
    :message Foo!)))
```

A horribly contrived example made so I can write the decoder. Was it worth it? Yes it was. We can see the obvious relation to JSON, since they both use two basic building blocks: Lists and dictionaries.

### Syntax ###

```lisp
; single-line comment

; atoms
atom
; simply a value. there are special values an atom may hold:
nil
; which means null/false in other languages, and
t
; which means true

; symbols
:atom
; symbols are atoms prefixed by a colon. unlike atoms, the value is treated
; literally, so for instance :t evaluates to :t and not :true

; strings
"foobar"
; ye-olde strings. nothing surprising here. only double-quotes are accepted.
; you may specify unicode characters by using \uXXXX, where X is a hex digit.

; lists
(value0 value1 value2)
; a list of values (atoms, symbols, lists...) separated by spaces

; dicts
(:key0 val0 :key1 val1)
; a list of key=>value pairs
; former pair item is the key, which must be a symbol
; latter item is the value associated with the key, which can be anything
```

And that's it for now.

### Implementation ###
Presented here is a javascript implementation of the parser & encoder. Its API highly resembles the JSON object's API.

```javascript
//SEN.parse accepts SEN, returns the equivalent js object
js_obj = SEN.parse(sen_str);

//SEN.stringify accepts a js object, returns the equivalent in SEN
sen_str = SEN.stringify(js_obj)
```

As of the time of writing. `SEN.stringify` accepts a boolean 3rd parameter. If true, then the output string will be beautified.

#### TODOs ####
* Add the replacer argument to `SEN.stringify`

### License ###
WTFPL
