package com.app.whatsappcatalog;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    @PluginMethod
    public void getSharedData(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            JSObject data = activity.getSharedData();
            if (data != null) {
                call.resolve(data);
            } else {
                JSObject empty = new JSObject();
                call.resolve(empty);
            }
        } else {
            call.reject("Activity not available");
        }
    }

    @PluginMethod
    public void clearSharedData(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.clearSharedData();
            call.resolve();
        } else {
            call.reject("Activity not available");
        }
    }

    public void triggerShareEvent(JSObject data) {
        notifyListeners("onShareReceived", data);
    }
}
