// application/javascript;version=1.8
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

/* The methods list with their signatures.
 *
 * *** NOTE: If you add stuff here, you need to update testIntrospectReal
 */
var TestIface = <interface name="org.gnome.gjs.Test">
<method name="nonJsonFrobateStuff">
    <arg type="i" direction="in"/>
    <arg type="s" direction="out"/>
</method>
<method name="frobateStuff">
    <arg type="a{sv}" direction="in"/>
    <arg type="a{sv}" direction="out"/>
</method>
<method name="alwaysThrowException">
    <arg type="a{sv}" direction="in"/>
    <arg type="a{sv}" direction="out"/>
</method>
<method name="noInParameter">
    <arg type="s" direction="out"/>
</method>
<method name="multipleInArgs">
    <arg type="i" direction="in"/>
    <arg type="i" direction="in"/>
    <arg type="i" direction="in"/>
    <arg type="i" direction="in"/>
    <arg type="i" direction="in"/>
    <arg type="s" direction="out"/>
</method>
<method name="noReturnValue"/>
<method name="emitSignal"/>
<method name="multipleOutValues">
    <arg type="s" direction="out"/>
    <arg type="s" direction="out"/>
    <arg type="s" direction="out"/>
</method>
<method name="oneArrayOut">
    <arg type="as" direction="out"/>
</method>
<method name="arrayOfArrayOut">
    <arg type="aas" direction="out"/>
</method>
<method name="multipleArrayOut">
    <arg type="as" direction="out"/>
    <arg type="as" direction="out"/>
</method>
<method name="arrayOutBadSig">
    <arg type="i" direction="out"/>
</method>
<method name="byteArrayEcho">
    <arg type="ay" direction="in"/>
    <arg type="ay" direction="out"/>
</method>
<method name="byteEcho">
    <arg type="y" direction="in"/>
    <arg type="y" direction="out"/>
</method>
<method name="dictEcho">
    <arg type="a{sv}" direction="in"/>
    <arg type="a{sv}" direction="out"/>
</method>
<method name="echo">
    <arg type="s" direction="in"/>
    <arg type="i" direction="in"/>
    <arg type="s" direction="out"/>
    <arg type="i" direction="out"/>
</method>
<method name="structArray">
    <arg type="a(ii)" direction="out"/>
</method>
<signal name="signalFoo">
    <arg type="s" direction="out"/>
</signal>
<property name="PropReadOnly" type="b" access="read" />
<property name="PropWriteOnly" type="s" access="write" />
<property name="PropReadWrite" type="v" access="readwrite" />
</interface>

const PROP_READ_WRITE_INITIAL_VALUE = 58;
const PROP_WRITE_ONLY_INITIAL_VALUE = "Initial value";

log('about to build a Test class');
const Test = new Gio.DBusImplementerClass({
    Name: 'Test',
    Interface: TestIface,

    _init: function() {
	this.parent();

        this._propWriteOnly = PROP_WRITE_ONLY_INITIAL_VALUE;
        this._propReadWrite = PROP_READ_WRITE_INITIAL_VALUE;
    },

    frobateStuff: function(args) {
        return { hello: GLib.Variant.new('s', 'world') };
    },

    nonJsonFrobateStuff: function(i) {
        if (i == 42) {
            return "42 it is!";
        } else {
            return "Oops";
        }
    },

    alwaysThrowException: function() {
        throw Error("Exception!");
    },

    noInParameter: function() {
        return "Yes!";
    },

    multipleInArgs: function(a, b, c, d, e) {
        return a + " " + b + " " + c + " " + d + " " + e;
    },

    emitSignal: function() {
        this.emit_signal('signalFoo', "foobar");
    },

    noReturnValue: function() {
        /* Empty! */
    },

    /* The following two functions have identical return values
     * in JS, but the bus message will be different.
     * multipleOutValues is "sss", while oneArrayOut is "as"
     */
    multipleOutValues: function() {
        return [ "Hello", "World", "!" ];
    },

    oneArrayOut: function() {
        return [ "Hello", "World", "!" ];
    },

    /* Same thing again. In this case multipleArrayOut is "asas",
     * while arrayOfArrayOut is "aas".
     */
    multipleArrayOut: function() {
        return [[ "Hello", "World" ], [ "World", "Hello" ]];
    },

    arrayOfArrayOut: function() {
        return [[ "Hello", "World" ], [ "World", "Hello" ]];
    },

    arrayOutBadSig: function() {
        return [ "Hello", "World", "!" ];
    },

    byteArrayEcho: function(binaryString) {
        return binaryString;
    },

    byteEcho: function(aByte) {
        return aByte;
    },

    dictEcho: function(dict) {
        return dict;
    },

    /* This one is implemented asynchronously. Returns
     * the input arguments */
    echoAsync: function(parameters, invocation) {
	var [someString, someInt] = parameters;
        Mainloop.idle_add(function() {
            invocation.return_value(GLib.Variant.new('(si)', [someString, someInt]));
            return false;
        });
    },

    // boolean
    get PropReadOnly() {
        return true;
    },

    // string
    set PropWriteOnly(value) {
        this._propWriteOnly = value;
    },

    // variant
    get PropReadWrite() {
        return GLib.Variant.new('u', this._propReadWrite);
    },

    set PropReadWrite(value) {
        this._propReadWrite = value.deep_unpack();
    },

    structArray: function () {
        return [[128, 123456], [42, 654321]];
    }
});

var own_name_id;

const ProxyClass = new Gio.DBusProxyClass({
    Name: 'ProxyClass',
    Interface: TestIface,
});

const SlimProxyClass = new Gio.DBusProxyClass({
    Name: 'SlimProxyClass',
    Interface: TestIface,
    BusType: Gio.BusType.SESSION,
    BusName: 'org.gnome.gjs.Test',
    ObjectPath: '/org/gnome/gjs/Test'
});

var proxy, exporter;

function testExportStuff() {
    exporter = new Test();
    exporter.export(Gio.DBus.session, '/org/gnome/gjs/Test');

    own_name_id = Gio.DBus.session.own_name('org.gnome.gjs.Test',
					    Gio.BusNameOwnerFlags.NONE,
					    function(connection, name) {
						log("Acquired name " + name);
						
						Mainloop.quit('testGDBus');
					    },
					    function(connection, name) {
						log("Lost name " + name);
					    });

    Mainloop.run('testGDBus');
}

function testInitStuff() {
    var theError;
    proxy = new ProxyClass({ g_connection: Gio.DBus.session,
			     g_name: 'org.gnome.gjs.Test',
			     g_object_path: '/org/gnome/gjs/Test',
			     g_async_callback: function (obj, error) {
			       theError = error;
			       proxy = obj;

			       Mainloop.quit('testGDBus');
			     } });

    log(typeof(proxy._init) + " " + typeof(proxy._construct) + " " + typeof(proxy.frobateStuffRemote));

    Mainloop.run('testGDBus');

    assertNull(theError);
    assertNotNull(proxy);
}

function testInitSlimStuff() {
    var proxy, theError;
    proxy = new SlimProxyClass({ g_async_callback: function (obj, error) {
	theError = error;
	proxy = obj;

	Mainloop.quit('testGDBus');
    }});

    Mainloop.run('testGDBus');

    assertNull(theError);
    assertNotNull(proxy);
}

function testFrobateStuff() {
    let theResult, theExcp;
    proxy.frobateStuffRemote({}, function(result, excp) {
	theResult = result;
	theExcp = excp;
	Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertNull(theExcp);
    assertEquals("world", theResult[0].hello.deep_unpack());
}

/* excp must be exactly the exception thrown by the remote method
   (more or less) */
function testThrowException() {
    let theResult, theExcp;
    proxy.alwaysThrowExceptionRemote({}, function(result, excp) {
	theResult = result;
	theExcp = excp;
	Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertNull(theResult);
    assertNotNull(theExcp);
}

function testNonJsonFrobateStuff() {
    let theResult, theExcp;
    proxy.nonJsonFrobateStuffRemote(42, function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertEquals("42 it is!", theResult);
    assertNull(theExcp);
}

function testNoInParameter() {
    let theResult, theExcp;
    proxy.noInParameterRemote(function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertEquals("Yes!", theResult);
    assertNull(theExcp);
}

function testMultipleInArgs() {
    let theResult, theExcp;
    proxy.multipleInArgsRemote(1, 2, 3, 4, 5, function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertEquals("1 2 3 4 5", theResult);
    assertNull(theExcp);
}

function testNoReturnValue() {
    let theResult, theExcp;
    proxy.noReturnValueRemote(function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertEquals(undefined, theResult);
    assertNull(theExcp);
}

function testEmitSignal() {
    let theResult, theExcp;
    let signalReceived = 0;
    let signalArgument = null;
    let id = proxy.connectSignal('signalFoo',
				 function(emitter, senderName, parameters) {
				     signalReceived ++;
				     [signalArgument] = parameters;

				     proxy.disconnectSignal(id);
				 });
    proxy.emitSignalRemote(function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        if (excp)
            log("Signal emission exception: " + excp);
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertUndefined('result should be undefined', theResult);
    assertNull('no exception set', theExcp);
    assertEquals('number of signals received', signalReceived, 1);
    assertEquals('signal argument', signalArgument, "foobar");

}

function testMultipleOutValues() {
    let theResult, theExcp;
    proxy.multipleOutValuesRemote(function(result, excp) {
        theResult = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertEquals("Hello", theResult[0]);
    assertEquals("World", theResult[1]);
    assertEquals("!", theResult[2]);
    assertNull(theExcp);
}

function testOneArrayOut() {
    let theResult, theExcp;
    proxy.oneArrayOutRemote(function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    assertEquals("Hello", theResult[0]);
    assertEquals("World", theResult[1]);
    assertEquals("!", theResult[2]);
    assertNull(theExcp);
}

function testArrayOfArrayOut() {
    let theResult, theExcp;
    proxy.arrayOfArrayOutRemote(function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    let a1 = theResult[0];
    let a2 = theResult[1];

    assertEquals("Hello", a1[0]);
    assertEquals("World", a1[1]);

    assertEquals("World", a2[0]);
    assertEquals("Hello", a2[1]);;

    assertNull(theExcp);
}

function testMultipleArrayOut() {
    let theResult, theExcp;
    proxy.multipleArrayOutRemote(function(result, excp) {
        theResult = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');

    let a1 = theResult[0];
    let a2 = theResult[1];

    assertEquals("Hello", a1[0]);
    assertEquals("World", a1[1]);

    assertEquals("World", a2[0]);
    assertEquals("Hello", a2[1]);;

    assertNull(theExcp);
}

/* We are returning an array but the signature says it's an integer,
 * so this should fail
 */
function testArrayOutBadSig() {
    let theResult, theExcp;
    proxy.arrayOutBadSigRemote(function(result, excp) {
        theResult = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');
    assertNull(theResult);
    assertNotNull(theExcp);
}

function testAsyncImplementation() {
    let someString = "Hello world!";
    let someInt = 42;
    let theResult, theExcp;
    proxy.echoRemote(someString, someInt,
                     function(result, excp) {
                         theResult = result;
                         theExcp = excp;
                         Mainloop.quit('testGDBus');
                     });

    Mainloop.run('testGDBus');
    assertNull(theExcp);
    assertNotNull(theResult);
    assertEquals(theResult[0], someString);
    assertEquals(theResult[1], someInt);
}

function testBytes() {
    let someBytes = [ 0, 63, 234 ];
    let theResult, theExcp;
    for (let i = 0; i < someBytes.length; ++i) {
        theResult = null;
        theExcp = null;
        proxy.byteEchoRemote(someBytes[i], function(result, excp) {
            [theResult] = result;
            theExcp = excp;
            Mainloop.quit('testGDBus');
        });

        Mainloop.run('testGDBus');
        assertNull(theExcp);
        assertNotNull(theResult);
        assertEquals(someBytes[i], theResult);
    }
}

function testStructArray() {
    let theResult, theExcp;
    proxy.structArrayRemote(function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });
    Mainloop.run('testGDBus');
    assertNull(theExcp);
    assertNotNull(theResult);
    assertEquals(theResult[0][0], 128);
    assertEquals(theResult[0][1], 123456);
    assertEquals(theResult[1][0], 42);
    assertEquals(theResult[1][1], 654321);
}

function testDictSignatures() {
    let someDict = {
        aDouble: GLib.Variant.new('d', 10),
        // should be an integer after round trip
        anInteger: GLib.Variant.new('i', 10.5),
        // should remain a double
        aDoubleBeforeAndAfter: GLib.Variant.new('d', 10.5),
    };
    let theResult, theExcp;
    proxy.dictEchoRemote(someDict, function(result, excp) {
        [theResult] = result;
        theExcp = excp;
        Mainloop.quit('testGDBus');
    });

    Mainloop.run('testGDBus');
    assertNull(theExcp);
    assertNotNull(theResult);

    // verify the fractional part was dropped off int
    assertEquals(11, theResult['anInteger'].deep_unpack());

    // and not dropped off a double
    assertEquals(10.5, theResult['aDoubleBeforeAndAfter'].deep_unpack());

    // this assertion is useless, it will work
    // anyway if the result is really an int,
    // but it at least checks we didn't lose data
    assertEquals(10.0, theResult['aDouble'].deep_unpack());
}

function testProperties() {
    let readonly = proxy.PropReadOnly;
    assertEquals(true, readonly);

    let readwrite = proxy.PropReadWrite;
    assertTrue(readwrite instanceof GLib.Variant);
    assertEquals(PROP_READ_WRITE_INITIAL_VALUE, readwrite.deep_unpack());

    // we cannot test property sets, as those happen asynchronously
}

function testFinalize() {
    // clean everything up, before we destroy the context
    // (otherwise, gio will report a name owner changed signal
    // in idle, which will be called in some other test)
    Gio.DBus.session.unown_name(own_name_id);

    proxy = exporter = null;
    context = GLib.MainContext.default();
    while (context.iteration(false));
}

gjstestRun();
